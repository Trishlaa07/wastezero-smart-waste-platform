import type { Opportunity } from "../types";

export const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const setUser = (user: any) => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const clearUser = () => {
    localStorage.removeItem('user');
};

export const getOpportunities = (): Opportunity[] => {
    const opps = localStorage.getItem('opportunities');
    return opps ? JSON.parse(opps) : [];
};

export const setOpportunities = (opps: Opportunity[]) => {
    localStorage.setItem('opportunities', JSON.stringify(opps));
};

export const addOpportunity = (opp: Opportunity) => {
    const opps = getOpportunities();
    opps.push(opp);
    setOpportunities(opps);
};

export const updateOpportunity = (updatedOpp: Opportunity) => {
    const opps = getOpportunities();
    const index = opps.findIndex(o => o.id === updatedOpp.id);
    if (index !== -1) {
        opps[index] = updatedOpp;
        setOpportunities(opps);
    }
};

export const deleteOpportunity = (id: string) => {
    const opps = getOpportunities();
    const newOpps = opps.filter(o => o.id !== id);
    setOpportunities(newOpps);
};
