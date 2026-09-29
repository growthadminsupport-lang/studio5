import { createContext, useContext, useMemo, useState } from "react";

// Shared child list + which child is selected, so switching a child on
// any page (Dashboard, Growth, Puberty, Bone age) applies everywhere.
// Mock data for now — same shape as the API's Child (docs/api.md), so
// swapping in GET /children later needs no changes on the pages.
// Age, "Born ..." and Girl/Boy labels are derived in utils/childDisplay.js.
const INITIAL_CHILDREN = [
  {
    id: "c1",
    fullName: "growth",
    nickname: "",
    sex: "FEMALE", // 'FEMALE' | 'MALE'
    dateOfBirth: "2008-05-05", // 'YYYY-MM-DD'
    relation: "PARENT", // 'PARENT' | 'GUARDIAN' | 'RELATIVE'
    createdAt: "2026-09-14T08:30:00.000Z",
  },
];

const ChildrenContext = createContext(null);

export function ChildrenProvider({ children: tree }) {
  const [kids, setKids] = useState(INITIAL_CHILDREN);
  const [activeChildId, setActiveChildId] = useState(INITIAL_CHILDREN[0]?.id ?? null);

  const value = useMemo(() => {
    const activeChild = kids.find((c) => c.id === activeChildId) ?? null;

    function removeChild(id) {
      setKids((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeChildId === id) setActiveChildId(next[0]?.id ?? null);
        return next;
      });
    }

    // Async on purpose: the pages already `await` these, so switching to
    // POST /children and PATCH /children/:id later only changes this file.
    // `data` is the request body from docs/api.md:
    // { fullName, nickname, sex, dateOfBirth, relation }
    async function addChild(data) {
      const child = {
        id: `local-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
      };
      setKids((prev) => [...prev, child]);
      setActiveChildId(child.id); // a newly added child becomes the selected one
      return child;
    }

    async function updateChild(id, data) {
      const current = kids.find((c) => c.id === id);
      if (!current) throw new Error('Child not found');
      const updated = { ...current, ...data };
      setKids((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      return updated;
    }

    function getChild(id) {
      return kids.find((c) => c.id === id) ?? null;
    }

    return {
      children: kids,
      activeChild,
      activeChildId,
      setActiveChildId,
      getChild,
      addChild,
      updateChild,
      removeChild,
    };
  }, [kids, activeChildId]);

  return <ChildrenContext.Provider value={value}>{tree}</ChildrenContext.Provider>;
}

export function useChildren() {
  return useContext(ChildrenContext);
}