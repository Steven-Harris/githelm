/**
 * GitHub Validation Module
 * Contains utility functions for validating GitHub tokens and other credentials
 * Separated to avoid circular dependencies
 */

/**
 * Validates if a GitHub token is valid by making a lightweight API call
 * 
 * @param githubToken The GitHub token to validate
 * @returns Promise resolving to true if token is valid, false otherwise
 */
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