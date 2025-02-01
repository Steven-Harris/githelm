import {
    Firebase,
    clearSiteData,
    fetchDataAndSaveToLocalStorage,
    getPendingEnvironments,
    getSiteData,
    reviewDeployment
} from '@services';
import {
    ACTIONS_ADD_REPO_FORM,
    ACTIONS_CONFIG,
    ACTIONS_LABELS,
    ACTIONS_LABELS_INPUT,
    ACTIONS_ORG_INPUT,
    ACTIONS_REPO_INPUT,
    ACTIONS_REQUESTS_CONFIG,
    APP,
    APPROVE_ACTION_BUTTON,
    CANCEL_ACTIONS_CONFIG_BUTTON,
    CANCEL_PULL_REQUESTS_CONFIG_BUTTON,
    CLOSE_REVIEW_MODAL,
    COPYRIGHT,
    EDIT_ACTIONS_BUTTON,
    EDIT_PULL_REQUESTS_BUTTON,
    LOGIN_BUTTON,
    LOGOUT_BUTTON,
    LastUpdated,
    PR_ADD_REPO_FORM,
    PR_LABELS,
    PR_LABELS_INPUT,
    PR_ORG_INPUT,
    PR_REPO_INPUT,
    PULL_REQUESTS_CONFIG,
    REFRESH_BUTTON,
    REJECT_ACTION_BUTTON,
    REVIEW_COMMENT,
    SAVE_ACTIONS_CONFIG_BUTTON,
    SAVE_PULL_REQUESTS_CONFIG_BUTTON,
    addActionsFilterChip,
    addPRFilterChip,
    clearActionInputs,
    clearPRConfig,
    clearPRInputs,
    createRepoCard,
    createRepoCards,
    getConfigs,
    hideEditActions,
    hideEditPullRequests,
    hideReviewModal,
    loadContent,
    loadReviewModal,
    showContent,
    showEditActions,
    showEditPullRequests,
    showLoading
} from '@ui';
import Sortable from 'sortablejs';
import { initPWA } from './pwa';

declare global {
    interface Window {
        reviewDeployment: (event: any) => void;
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    console.log('preview')
    const firebase = new Firebase();
    const lastUpdated = new LastUpdated();
    Sortable.create(PULL_REQUESTS_CONFIG, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        handle: '.sortable-handle',
    });

    Sortable.create(ACTIONS_CONFIG, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        handle: '.sortable-handle',
    });
    setCopyrightYear();
    initPWA(APP);
    approvalButtons();
    editingButtons(firebase, lastUpdated);

    await handleState(firebase, lastUpdated);

    LOGIN_BUTTON.addEventListener('click', async () => {
        const signedIn = await firebase.signIn();
        if (!signedIn) { return; }
        await handleState(firebase, lastUpdated);
    });

    LOGOUT_BUTTON.addEventListener('click', () => {
        firebase.signOut();
        clearSiteData();
        window.location.reload();
    });

});

function editingButtons(firebase: Firebase, lastUpdated: LastUpdated) {

    PR_LABELS_INPUT.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
            const filter = PR_LABELS_INPUT.value.trim();
            if (filter) {
                addPRFilterChip(filter);
                PR_LABELS_INPUT.value = '';
            }
            event.preventDefault();
        }
    });

    PR_ADD_REPO_FORM.addEventListener('submit', (event) => {
        event.preventDefault();

        const org = PR_ORG_INPUT.value.trim();
        const repo = PR_REPO_INPUT.value.trim();
        if (org && repo) {
            const repoCard = createRepoCard(org, repo, PR_LABELS);
            PULL_REQUESTS_CONFIG.appendChild(repoCard);

            repoCard.querySelector('.remove-repo-button')!.addEventListener('click', () => {
                PULL_REQUESTS_CONFIG.removeChild(repoCard);
            });
            clearPRInputs();
        }
    });

    EDIT_PULL_REQUESTS_BUTTON.addEventListener('click', async () => {
        showEditPullRequests();
    });

    SAVE_PULL_REQUESTS_CONFIG_BUTTON.addEventListener('click', async () => {
        const prConfigs = getConfigs(PULL_REQUESTS_CONFIG);
        await firebase.savePRConfig(prConfigs);
        hideEditPullRequests();
        fetchDataAndUpdateContent(firebase, lastUpdated);
    });

    CANCEL_PULL_REQUESTS_CONFIG_BUTTON.addEventListener('click', () => {
        loadConfig(firebase)
        hideEditPullRequests();
    });

    ACTIONS_LABELS_INPUT.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
            const filter = ACTIONS_LABELS_INPUT.value.trim();
            if (filter) {
                addActionsFilterChip(filter);
                ACTIONS_LABELS_INPUT.value = '';
            }
            event.preventDefault();
        }
    });

    ACTIONS_ADD_REPO_FORM.addEventListener('submit', (event) => {
        event.preventDefault();

        const org = ACTIONS_ORG_INPUT.value.trim();
        const repo = ACTIONS_REPO_INPUT.value.trim();
        if (org && repo) {
            const repoCard = createRepoCard(org, repo, ACTIONS_LABELS);
            ACTIONS_CONFIG.appendChild(repoCard);

            repoCard.querySelector('.remove-repo-button')!.addEventListener('click', () => {
                ACTIONS_CONFIG.removeChild(repoCard);
            });
            clearActionInputs();
        }
    });

    EDIT_ACTIONS_BUTTON.addEventListener('click', () => {
        showEditActions();
    });

    SAVE_ACTIONS_CONFIG_BUTTON.addEventListener('click', async () => {
        const configs = getConfigs(ACTIONS_REQUESTS_CONFIG);
        await firebase.saveActionsConfig(configs);
        hideEditActions();
        fetchDataAndUpdateContent(firebase, lastUpdated);
    });

    CANCEL_ACTIONS_CONFIG_BUTTON.addEventListener('click', () => {
        hideEditActions();
    });
}

function approvalButtons() {
    window.reviewDeployment = async (event: any) => {
        const { org, repo, runId } = event.target.dataset;
        const environments = await getPendingEnvironments(org, repo, runId);
        loadReviewModal(org, repo, runId, environments);
    };

    CLOSE_REVIEW_MODAL.addEventListener('click', () => {
        hideReviewModal();
    });

    APPROVE_ACTION_BUTTON.addEventListener('click', async (event: any) => {
        const { org, repo, runId } = event.target.dataset;
        const selectedEnvironments = getSelectedEnvironments();
        await reviewDeployment(org, repo, runId, selectedEnvironments, 'approved', REVIEW_COMMENT.value);
        hideReviewModal();
    });

    REJECT_ACTION_BUTTON.addEventListener('click', async (event: any) => {
        const { org, repo, runId } = event.target.dataset;
        const selectedEnvironments = getSelectedEnvironments();
        await reviewDeployment(org, repo, runId, selectedEnvironments, 'rejected', REVIEW_COMMENT.value);
        hideReviewModal();
    });
}

async function handleState(firebase: Firebase, lastUpdated: LastUpdated) {
    if (!Firebase.signedIn()) { return; }

    const updatedData = getSiteData();
    await loadConfig(firebase);
    await loadContent(updatedData);
    lastUpdated.startTimer();
    showContent();

    await fetchDataAndUpdateContent(firebase, lastUpdated);
    setInterval(async () => await fetchDataAndUpdateContent(firebase, lastUpdated), 60 * 1000);

    REFRESH_BUTTON.addEventListener('click', async (event) => {
        event.preventDefault();
        showLoading();
        await fetchDataAndUpdateContent(firebase, lastUpdated)
    });
}

async function fetchDataAndUpdateContent(firebase: Firebase, lastUpdated: LastUpdated) {
    await fetchDataAndSaveToLocalStorage(firebase.Config);
    const updatedData = getSiteData();
    await loadContent(updatedData);
    lastUpdated.startTimer();
}

async function loadConfig(firebase: Firebase) {
    try {
        clearPRConfig()
        await firebase.getConfig();
        createRepoCards(firebase.Config.pullRequests, PULL_REQUESTS_CONFIG);
        createRepoCards(firebase.Config.actions, ACTIONS_REQUESTS_CONFIG);
    } catch (error) {
        console.error("Failed to load pull request configs:", error);
    }
}

function getSelectedEnvironments() {
    const checkboxes = document.querySelectorAll('#pending-environments input[type="checkbox"]:checked');
    return Array.from(checkboxes).map((checkbox: any) => Number(checkbox.dataset.id) as number);
};

function setCopyrightYear() {
    COPYRIGHT.innerHTML = `${new Date().getFullYear().toString()}`;
}