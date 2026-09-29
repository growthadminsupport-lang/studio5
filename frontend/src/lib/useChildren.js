import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authedRequest } from './api';

export function childView(row, records = []) {
  const birth = new Date(`${row.date_of_birth}T00:00:00`);
  const today = new Date();
  const months = Math.max(0, (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth() - (today.getDate() < birth.getDate() ? 1 : 0));
  const latest = records[0];
  return { ...row, dateOfBirth: row.date_of_birth, gender: row.sex === 'female' ? 'Girl' : 'Boy',
    ageLabel: `${Math.floor(months / 12)} Years, ${months % 12} Months`,
    ageShort: `${Math.floor(months / 12)} years old`, bornLabel: `Born ${birth.toLocaleDateString()}`,
    height: latest?.height_cm ?? null, weight: latest?.weight_kg ?? null, bmi: latest?.bmi ?? null,
    heightPercentile: latest?.height_percentile ?? null, weightPercentile: latest?.weight_percentile ?? null,
    bmiPercentile: latest?.bmi_percentile ?? null, records };
}

export function useChildren() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const key = `growth_child_${user?.id}`;
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const rows = await authedRequest('/api/children');
        const items = await Promise.all(rows.map(async (row) => childView(row, await authedRequest(`/api/children/${row.id}/growth`))));
        if (active) { setChildren(items); setError(''); }
      } catch (reason) { if (active) setError(reason.message); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [user?.id, revision]);
  const activeChildId = children.find((row) => row.id === (selected || sessionStorage.getItem(key)))?.id ?? children[0]?.id ?? null;
  function setActiveChildId(id) { setSelected(id); sessionStorage.setItem(key, id); }
  async function removeChild(id) {
    try {
      await authedRequest(`/api/children/${id}`, { method: 'DELETE' });
      setChildren((rows) => rows.filter((row) => row.id !== id));
    } catch (reason) { setError(reason.message); }
  }
  return { children, child: children.find((row) => row.id === activeChildId), activeChildId,
    setActiveChildId, loading, error, removeChild, reload: () => setRevision((value) => value + 1) };
}
