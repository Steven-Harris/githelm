/**
 * GitHub Repositories Module
 * Handles repository listing and information retrieval
 */

import { executeGraphQLQuery } from './api-client';
import { type Repository } from './types';

/**
 * Search for repositories accessible to the authenticated user
 * 
 * @returns Promise resolving to array of repositories
 */
export async function searchUserRepositories(): Promise<Repository[]> {
  const query = `
    query SearchUserRepos {
      viewer {
        repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            name
            nameWithOwner
            owner {
              login
            }
            isPrivate
          }
        }
      }
    }
  `;
  
  try {
    const data = await executeGraphQLQuery(query);
    return transformUserRepositories(data);
  } catch (error) {
    console.error('Error fetching user repositories:', error);
    return [];
  }
}

/**
 * Transform GraphQL repositories response to Repository format
 * 
 * @param data GraphQL response data
 * @returns Array of repositories
 */
function transformUserRepositories(data: any): Repository[] {
  if (!data?.viewer?.repositories?.nodes) {
    return [];
  }
  
  return data.viewer.repositories.nodes.map((repo: any) => ({
    id: 0, // Actual ID not needed for our purpose
    name: repo.name,
    full_name: repo.nameWithOwner,
    owner: {
      login: repo.owner.login
    },
    html_url: `https://github.com/${repo.nameWithOwner}`,
    isPrivate: repo.isPrivate,
    // Add minimal required properties to satisfy the Repository interface
    node_id: '',
    fork: false,
    url: `https://api.github.com/repos/${repo.nameWithOwner}`,
    subscribers_url: `https://api.github.com/repos/${repo.nameWithOwner}/subscribers`,
    subscription_url: `https://api.github.com/repos/${repo.nameWithOwner}/subscription`
  }));
}