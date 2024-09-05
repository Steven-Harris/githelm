export function pullRequestTemplate(repo, pullRequests) {
  return `
        <h3 class="text-lg font-semibold">${repo}</h3>
        <ul>${pullRequests.items.map(pr => `
            <li class="mb-2 flex items-center">
                <div id="pr-item" class="p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex-grow flex items-center">
                    <a href="${pr.html_url}" target="_blank" class="link flex-grow max-w-70">${pr.title}</a>
                    <span class="reviews-container flex items-center">
                      ${pr.reviews.length < 3
      ? pr.reviews.map(review => `
                              <img src="${review.user.avatar_url}" class="avatar" alt="${review.user.login}" />
                              <label class="review-state ${review.state === "APPROVED" ? "approved" : "not-approved"}">${review.state.toLowerCase()}</label>
                            `).join("")
      : pr.reviews.slice(0, 3).map(review => `
                              <img src="${review.user.avatar_url}" class="avatar" alt="${review.state.toLowerCase()}" title="${review.state.toLowerCase()}" />
                            `).join("")
    }
                      ${pr.reviews.length > 3 ? `<span class="more-approvers">+${pr.reviews.length - 3}</span>` : ""}
                    </span>
                </div>
            </li>`).join("")}
        </ul>
    `;
}

export function actionsTemplate(repo, actions) {
  return `
        <h3 class="text-lg font-semibold">${repo}</h3>
        <ul class="flex flex-wrap">${actions.workflow_runs.map(workflow => `
            <li class="mb-2 flex-grow items-center">
                <div class="p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex-grow">
                    <a href="${workflow.html_url}" target="_blank" class="link">${workflow.name}</a>
                    ${workflowTemplate(workflow)} 
                </div>
            </li>`).join("")}
        </ul>`;
}

export function workflowTemplate(workflow) {
  return `
    <ul id="${workflow.id}" class="flex flex-wrap -m-1">
        ${workflow.jobs.map(job => jobTemplate(job)).join("")}
    </ul>
  `;
}

export function jobTemplate(job) {
  return `
        <li class="p-1">
            <span class="${job.status === "completed" && job.conclusion === "success" ? "bg-green-200 border-green-600"
      : job.conclusion === "failure" ? "bg-red-200 border-red-600"
        : job.status === "waiting" ? "bg-yellow-200 border-yellow-600"
          : job.status === "in_progress" ? "bg-blue-200 border-blue-600"
            : "bg-gray-300 border-gray-300"} 
                    border rounded-lg p-3 shadow-sm flex justify-between items-center text-gray-600">
                <label class="text-sm">${job.name}</label>
            </span>
        </li>
        `;
}