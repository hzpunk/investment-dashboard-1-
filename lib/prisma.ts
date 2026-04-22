// Prisma client is server-only
declare global {
  // eslint-disable-next-line no-var
  var prisma: any
}

const isServer = typeof window === 'undefined'

let prisma: any = null

if (isServer) {
  const { PrismaClient } = require('@prisma/client')
  
  if (process.env.NODE_ENV !== 'production') {
    if (!global.prisma) {
      global.prisma = new PrismaClient()
    }
    prisma = global.prisma
  } else {
    prisma = new PrismaClient()
  }
}

export { prisma }
