import { hashPassword, verifyPassword } from '@/lib/password'

test('hashPassword/verifyPassword roundtrip', async () => {
  const pw = 'correct horse battery staple'
  const hash = await hashPassword(pw)
  expect(hash).toBeTruthy()
  await expect(verifyPassword(pw, hash)).resolves.toBe(true)
  await expect(verifyPassword('wrong', hash)).resolves.toBe(false)
})
