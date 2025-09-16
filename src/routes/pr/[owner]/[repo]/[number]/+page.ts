import type { PageLoad } from './$types';

export const prerender = false;
export const ssr = false;
export const csr = true;

export const load: PageLoad = async ({ params }) => {
  return {
    owner: params.owner,
    repo: params.repo,
    prNumber: parseInt(params.number)
  };
};
