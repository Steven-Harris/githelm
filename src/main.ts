import {
    Firebase,
    clearSiteData,
    fetchDataAndSaveToLocalStorage,
    getPendingEnvironments,
    getSiteData,
    reviewDeployment
} from '@services';
import {
    APPROVE_ACTION_BUTTON,
    CANCEL_ACTIONS_CONFIG_BUTTON,
    CANCEL_PULL_REQUESTS_CONFIG_BUTTON,
    CLOSE_REVIEW_MODAL,
    EDIT_ACTIONS_BUTTON,
    EDIT_PULL_REQUESTS_BUTTON,
    LOGIN_BUTTON,
    LOGOUT_BUTTON,
    LastUpdated,
    REJECT_ACTION_BUTTON,
    REVIEW_COMMENT,
    SAVE_ACTIONS_CONFIG_BUTTON,
    SAVE_PULL_REQUESTS_CONFIG_BUTTON,
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
import { initPWA } from './pwa';

declare global {
    interface Window {
        reviewDeployment: (event: any) => void;
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    const firebase = new Firebase();
    const lastUpdated = new LastUpdated();
    initPWA(document.getElementById('app')!);
    loginButtons(firebase, lastUpdated);
    approvalButtons();
    editingButtons();

    const localStorageData = getSiteData();

    setInterval(async () => {
        if (!Firebase.signedIn()) { return; }
        await updateLocalStorageAndLoadContent(lastUpdated);
    }, 60 * 1000);

    if (!Firebase.signedIn()) { return; }
    showContent();
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

function editingButtons() {
    EDIT_PULL_REQUESTS_BUTTON.addEventListener('click', async () => {
        showEditPullRequests();
    });

    SAVE_PULL_REQUESTS_CONFIG_BUTTON.addEventListener('click', () => {
        hideEditPullRequests();
    });

    CANCEL_PULL_REQUESTS_CONFIG_BUTTON.addEventListener('click', () => {
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
    await fetchDataAndSaveToLocalStorage();
    const updatedData = getSiteData();
    if (!updatedData) {
        setNoContent();
    }
    await loadContent(updatedData);
    lastUpdated.startTimer();
}

function getSelectedEnvironments() {
    const checkboxes = document.querySelectorAll('#pending-environments input[type="checkbox"]:checked');
    return Array.from(checkboxes).map((checkbox: any) => Number(checkbox.dataset.id) as number);
};