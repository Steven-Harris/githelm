import {
    Firebase,
    clearSiteData,
    fetchDataAndSaveToLocalStorage,
    getPendingEnvironments,
    getSiteData,
    reviewDeployment
} from '@services';
import {
    ADD_REPO_FORM,
    APPROVE_ACTION_BUTTON,
    CANCEL_ACTIONS_CONFIG_BUTTON,
    CANCEL_PULL_REQUESTS_CONFIG_BUTTON,
    CLOSE_REVIEW_MODAL,
    COPYRIGHT,
    EDIT_ACTIONS_BUTTON,
    EDIT_PULL_REQUESTS_BUTTON,
    LABELS,
    LABELS_INPUT,
    LOGIN_BUTTON,
    LOGOUT_BUTTON,
    LastUpdated,
    ORG_INPUT,
    PULL_REQUESTS_CONFIG,
    REFRESH_BUTTON,
    REJECT_ACTION_BUTTON,
    REPO_INPUT,
    REVIEW_COMMENT,
    SAVE_ACTIONS_CONFIG_BUTTON,
    SAVE_PULL_REQUESTS_CONFIG_BUTTON,
    addFilterChip,
    clearPRConfig,
    createRepoCard,
    getPullRequestConfigs,
    hideEditActions,
    hideEditPullRequests,
    hideReviewModal,
    loadContent,
    loadReviewModal,
    setNoContent,
    showContent,
    showEditActions,
    showEditPullRequests
} from '@ui';
import Sortable from 'sortablejs';
import { initPWA } from './pwa';

declare global {
    interface Window {
        reviewDeployment: (event: any) => void;
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    const firebase = new Firebase();
    const lastUpdated = new LastUpdated();
    Sortable.create(PULL_REQUESTS_CONFIG, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        handle: '.sortable-handle',
    });
    setCopyrightYear();
    initPWA(document.getElementById('app')!);
    loginButtons(firebase, lastUpdated);
    approvalButtons();
    editingButtons(firebase);

    const localStorageData = getSiteData();

    REFRESH_BUTTON.addEventListener('click', async () => await updateLocalStorageAndLoadContent(lastUpdated));
    setInterval(async () => await updateLocalStorageAndLoadContent(lastUpdated), 60 * 1000);

    if (!Firebase.signedIn()) { return; }
    showContent();
    await loadPullRequestConfigs(new Firebase());

    if (localStorageData) {
        await loadContent(localStorageData);
        lastUpdated.startTimer();
    } else {
        await updateLocalStorageAndLoadContent(lastUpdated);
    }

});

function loginButtons(firebase: Firebase, lastUpdated: LastUpdated) {
    LOGIN_BUTTON.addEventListener('click', async () => {
        const signedIn = await firebase.signIn();
        if (!signedIn) { return; }
        showContent();
        await updateLocalStorageAndLoadContent(lastUpdated);
    });

    LOGOUT_BUTTON.addEventListener('click', () => {
        firebase.signOut();
        clearSiteData();
        window.location.reload();
    });
}

function editingButtons(firebase: Firebase) {

    LABELS_INPUT.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const filter = LABELS_INPUT.value.trim();
            if (filter) {
                addFilterChip(filter);
                LABELS_INPUT.value = '';
            }
            event.preventDefault();
        }
    });

    ADD_REPO_FORM.addEventListener('submit', (event) => {
        event.preventDefault();

        const org = ORG_INPUT.value.trim();
        const repo = REPO_INPUT.value.trim();
        if (org && repo) {
            createRepoCard(org, repo, LABELS);
        }
    });
    EDIT_PULL_REQUESTS_BUTTON.addEventListener('click', async () => {
        showEditPullRequests();
    });

    SAVE_PULL_REQUESTS_CONFIG_BUTTON.addEventListener('click', async () => {
        const prConfigs = getPullRequestConfigs();
        await firebase.savePRConfig(prConfigs);
        hideEditPullRequests();
    });

    CANCEL_PULL_REQUESTS_CONFIG_BUTTON.addEventListener('click', () => {
        loadPullRequestConfigs(new Firebase())
        hideEditPullRequests();
    });

    EDIT_ACTIONS_BUTTON.addEventListener('click', () => {
        showEditActions();
    });

    SAVE_ACTIONS_CONFIG_BUTTON.addEventListener('click', () => {
        showEditActions();
    });

    CANCEL_ACTIONS_CONFIG_BUTTON.addEventListener('click', () => {
        hideEditActions();
    });
}

function approvalButtons() {
    window.reviewDeployment = async (event: any) => {
        const target = event.target as HTMLElement;
        if (!target) {
            console.error('Event target is undefined');
            return;
        }
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

async function updateLocalStorageAndLoadContent(lastUpdated: LastUpdated) {
    if (!Firebase.signedIn()) { return; }
    await fetchDataAndSaveToLocalStorage();
    const updatedData = getSiteData();
    if (!updatedData) {
        setNoContent();
    }
    await loadContent(updatedData);
    lastUpdated.startTimer();
}

async function loadPullRequestConfigs(firebase: Firebase) {
    try {
        clearPRConfig()
        const config = await firebase.getConfig();
        config.pullRequests.forEach(prConfig => {
            createRepoCard(prConfig.org, prConfig.repo, prConfig.filters);
        });
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