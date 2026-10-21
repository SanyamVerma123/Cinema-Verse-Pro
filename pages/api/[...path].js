import expressApp from '../../server';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default function handler(req, res) {
  return expressApp(req, res);
}
