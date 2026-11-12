// Alte Links /exhibition.html?id=<id> dauerhaft auf /exhibition/<id> umleiten
// (als Route Handler, damit der Query-Parameter nicht mit umgeleitet wird)
export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') || ''
  const target = /^[a-z0-9-]+$/i.test(id) ? '/exhibition/' + encodeURIComponent(id) : '/exhibitions'

  return Response.redirect(new URL(target, request.url), 301)
}
