export default async function (context, req) {
  context.res = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain'
    },
    body: "I'm the responnse!"
  };
}
