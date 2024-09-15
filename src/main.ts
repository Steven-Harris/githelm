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
    CLOSE_REVIEW_MODAL,
    LOGIN_BUTTON,
    LOGOUT_BUTTON,
    LastUpdated,
    REJECT_ACTION_BUTTON,
    REVIEW_COMMENT,
    hideReviewModal,
    loadContent,
    loadReviewModal,
    setNoContent,
    showContent
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

    window.reviewDeployment = async (event: any) => {
        console.log(event);
        const target = event.target as HTMLElement;
        if (!target) {
            console.error('Event target is undefined');
            return;
        }
        const { org, repo, runId } = event.target.dataset;
        const environments = await getPendingEnvironments(org, repo, runId);
        loadReviewModal(org, repo, runId, environments);
    }

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

    // EDIT_PULL_REQUESTS_BUTTON.addEventListener('click', () => {
    //     console.log('Edit pull requests');
    // });

    // EDIT_ACTIONS_BUTTON.addEventListener('click', () => {
    //     console.log('Edit actions');
    // });

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
    return Array.from(checkboxes).map((checkbox: any) => checkbox.dataset.id);
};