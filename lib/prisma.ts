// Prisma client is server-only
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const isServer = typeof window === 'undefined'

function getPrisma(): PrismaClient {
  if (!isServer) {
    throw new Error('PrismaClient is server-only')
  }
  
  const { PrismaClient } = require('@prisma/client')
  
  if (process.env.NODE_ENV !== 'production') {
    if (!global.prisma) {
      global.prisma = new PrismaClient()
    }
    return global.prisma!
  }
  
  return new PrismaClient()
}

const prisma: PrismaClient = isServer ? getPrisma() : (null as unknown as PrismaClient)

export { prisma }
