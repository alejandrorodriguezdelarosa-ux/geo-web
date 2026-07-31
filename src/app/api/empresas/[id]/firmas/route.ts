import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomUUID } from "crypto"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { cifrar, type ContextoCifrado } from "@/lib/cripto"
import { normalizarOrigen } from "@/lib/origen"

const crearFirmaSchema = z.object({
  origin: z.string().trim().min(4, "Falta el dominio al que pertenece la firma").max(300),
  signatureInput: z.string().max(4096, "signatureInput no puede superar 4096 caracteres"),
  signature: z.string().max(4096, "signature no puede superar 4096 caracteres"),
  signatureAgent: z.string().max(4096, "signatureAgent no puede superar 4096 caracteres"),
  expiresAt: z.string().datetime("expiresAt debe ser una fecha válida"),
})

// Ningun caracter de control puede entrar en el valor de una cabecera HTTP: un
// retorno de carro y un salto de linea permitirian inyectar cabeceras nuevas. El
// modulo del motor aplica la misma regla, sin excepciones.
function sinCaracteresDeControl(texto: string): boolean {
  for (let i = 0; i < texto.length; i++) {
    if (texto.charCodeAt(i) < 32) {
      return false
    }
  }
  return true
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await ctx.params

  const empresa = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
  }

  const firmas = await prisma.crawlSignature.findMany({
    where: { userId: session.user.id, companyId: id },
    select: {
      id: true,
      origin: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  const conDiasRestantes = firmas.map((f) => ({
    ...f,
    diasRestantes: Math.ceil((f.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  }))

  return NextResponse.json({ firmas: conDiasRestantes })
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await ctx.params

  const empresa = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, website: true },
  })
  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const parsed = crearFirmaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    )
  }

  const { origin, signatureInput, signature, signatureAgent, expiresAt } = parsed.data

  // Validar caracteres de control
  if (
    !sinCaracteresDeControl(signatureInput) ||
    !sinCaracteresDeControl(signature) ||
    !sinCaracteresDeControl(signatureAgent)
  ) {
    return NextResponse.json(
      { error: "Las cabeceras no pueden contener caracteres de control" },
      { status: 400 }
    )
  }

  // Parsear y validar expiresAt
  const expiracion = new Date(expiresAt)
  const ahora = new Date()
  if (expiracion <= ahora) {
    return NextResponse.json(
      { error: "expiresAt debe ser una fecha futura" },
      { status: 400 }
    )
  }
  const diasHastaExpiracion = Math.ceil((expiracion.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
  if (diasHastaExpiracion > 100) {
    return NextResponse.json(
      { error: "expiresAt no puede estar a más de 100 días" },
      { status: 400 }
    )
  }

  // El origen es el dominio que se va a rastrear, y llega en el cuerpo. Ojo: NO se
  // puede deducir de signatureInput, que es una cabecera HTTP y no una URL.
  const origenNormalizado = normalizarOrigen(origin)
  if (!origenNormalizado) {
    return NextResponse.json(
      { error: "El dominio no es válido. Debe ser una dirección http o https, por ejemplo https://tutienda.com" },
      { status: 400 }
    )
  }

  // Validar que el origen coincide con el website de la empresa
  if (empresa.website) {
    const websiteNormalizado = normalizarOrigen(empresa.website)
    if (websiteNormalizado && websiteNormalizado !== origenNormalizado) {
      return NextResponse.json(
        {
          error: `El origen de la firma debe coincidir con el website de la empresa. Se esperaba: ${websiteNormalizado}`,
        },
        { status: 400 }
      )
    }
  }

  // Generar id de credencial y crear contexto de cifrado
  const credencialId = randomUUID()
  const contexto: ContextoCifrado = {
    credencialId,
    origen: origenNormalizado,
    campo: "",
  }

  try {
    // Cifrar cada cabecera con su propio campo
    const cifradoInput = cifrar(signatureInput, { ...contexto, campo: "signatureInput" })
    const cifradoFirma = cifrar(signature, { ...contexto, campo: "signature" })
    const cifradoAgente = cifrar(signatureAgent, { ...contexto, campo: "signatureAgent" })

    const firma = await prisma.$transaction(async (tx) => {
      // Reemplazo completo: si quedara la fila vieja y solo se actualizaran algunos
      // campos, podrian mezclarse cabeceras de dos firmas distintas.
      await tx.crawlSignature.deleteMany({
        where: { userId: session.user.id!, origin: origenNormalizado },
      })
      return tx.crawlSignature.create({
        data: {
          id: credencialId,
          userId: session.user.id!,
          companyId: empresa.id,
          origin: origenNormalizado,
          signatureInput: cifradoInput,
          signature: cifradoFirma,
          signatureAgent: cifradoAgente,
          expiresAt: expiracion,
        },
        select: {
          id: true,
          origin: true,
          expiresAt: true,
          createdAt: true,
        },
      })
    })

    const diasRestantes = Math.ceil((firma.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    return NextResponse.json(
      { firma: { ...firma, diasRestantes } },
      { status: 201 }
    )
  } catch (err) {
    const codigo = (err as { code?: string })?.code
    if (codigo === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una firma para este origen" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "No se pudo crear la firma" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await ctx.params

  const empresa = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
  }

  const firmaId = req.nextUrl.searchParams.get("firmaId")
  if (!firmaId) {
    return NextResponse.json(
      { error: "Se requiere el parámetro firmaId" },
      { status: 400 }
    )
  }

  const firma = await prisma.crawlSignature.findFirst({
    where: { id: firmaId, userId: session.user.id },
    select: { id: true },
  })
  if (!firma) {
    return NextResponse.json({ error: "Firma no encontrada" }, { status: 404 })
  }

  try {
    await prisma.crawlSignature.delete({
      where: { id: firmaId },
    })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar la firma" }, { status: 500 })
  }
}
