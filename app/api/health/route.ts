import { prisma } from '@/lib/prisma'
import { ApiErrorCode } from '@/lib/api-errors'
import { apiError, apiSuccess } from '@/lib/api-response'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    return apiSuccess({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'running'
      }
    })
  } catch (error) {
    return apiError(ApiErrorCode.DATABASE_ERROR, 'Health check failed', {
      status: 503,
      details: {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
          api: 'running',
        },
      },
    })
  }
}
