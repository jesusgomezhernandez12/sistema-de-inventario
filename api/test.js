export async function GET() {
  return new Response(JSON.stringify({ ok: true, msg: 'test works' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}