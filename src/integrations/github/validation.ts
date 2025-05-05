// This function is seperate to solve a circular dependency issue

export async function isGithubTokenValid(githubToken: string): Promise<boolean> {
  if (!githubToken) {
    return false;
  }
  
  try {
    // Make a lightweight request to GitHub API to test token validity
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    // If response is 401 Unauthorized, token is invalid
    if (response.status === 401) {
      return false;
    }
    
    // If we get here, token is valid
    return response.ok;
  } catch (error) {
    console.error('Error validating GitHub token:', error);
    return false;
  }
}