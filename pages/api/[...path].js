import expressApp from '../../server';

export const config = {
  api: { bodyParser: false },
};

export default function handler(req, res) {
  return expressApp(req, res);
}
