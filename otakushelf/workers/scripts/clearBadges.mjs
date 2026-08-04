import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dotvars = fs.readFileSync(path.join(__dirname, '..', '.dev.vars'), 'utf8')
const url = (dotvars.match(/^DATABASE_URL="(.*)"$/m) || [])[1]

if (!url) {
  console.error('DATABASE_URL not found in .dev.vars')
  process.exit(1)
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/clearBadges.mjs <email>')
  process.exit(1)
}

const prisma = new PrismaClient({ datasourceUrl: url }).$extends(withAccelerate())

try {
  const res = await prisma.user.updateMany({
    where: { email },
    data: { profile: { badges: [] } },
  })
  if (res.count === 0) {
    console.log(`No user found with email: ${email}`)
  } else {
    const u = await prisma.user.findFirst({ where: { email } })
    console.log(`Cleared badges for ${email}. badges now:`, (u.profile?.badges || []).length)
  }
} finally {
  await prisma.$disconnect()
}
