import { GET as callbackHandler } from '../callback/route';

export async function GET(request: Request) {
  return callbackHandler(request);
}
