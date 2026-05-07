import * as http from 'http'
import * as url from 'url'

// Run: npx tsx scripts/get-gmail-token.ts
const CLIENT_ID = process.env.GMAIL_CLIENT_ID!
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!
const PORT = 3456
const REDIRECT_URI = `http://localhost:${PORT}`

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly')}` +
  `&access_type=offline` +
  `&prompt=consent`

console.log('\n请在浏览器中打开以下链接授权 Gmail 访问：\n')
console.log(authUrl)
console.log('\n等待授权回调...\n')

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url ?? '', true)
  const code = parsed.query.code as string

  if (!code) {
    res.end('No code received')
    return
  }

  res.end('<html><body><h2>授权成功！请回到终端查看 refresh token。</h2></body></html>')
  server.close()

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json() as { refresh_token?: string; error?: string }

  if (tokens.error) {
    console.error('错误：', tokens)
    process.exit(1)
  }

  console.log('\n✅ 授权成功！\n')
  console.log('请将以下值添加到 .env.local：\n')
  console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`)
  console.log()
  process.exit(0)
})

server.listen(PORT)
