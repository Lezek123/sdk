export const GH_REPO_ROOT = 'https://github.com/Joystream/sdk'
export const GH_REPO_MAIN_BRANCH = 'dev'

export const consts = {
  gh: {
    rootUrl: GH_REPO_ROOT,
    mainBranch: GH_REPO_MAIN_BRANCH,
    cloneUrl: `${GH_REPO_ROOT}.git`,
    linkBaseUrl: `${GH_REPO_ROOT}/tree/${GH_REPO_MAIN_BRANCH}`,
    rawLinkBaseUrl: `${GH_REPO_ROOT}/raw/refs/heads/${GH_REPO_MAIN_BRANCH}`,
  },
}

export default consts
