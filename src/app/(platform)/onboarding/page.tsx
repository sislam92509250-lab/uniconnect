
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Heading, Empty } from '@/components/ui';
import { saveOnboarding } from '@/app/actions';

type Profile = {
    category: string;
    department_id: string | null;
    batch_mapping_id: string | null;
    program: string | null;
    graduation_year: number | null;
};

type Department = {
    id: string;
    code: string;
    name: string;
};

type Batch = {
    id: string;
    code: string;
    admission_year: number;
    department_id: string;
};

export default function Onboarding() {
    const [supabase] = useState(() => createClient());

    const [profile, setProfile] = useState<Profile | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [mappings, setMappings] = useState<Batch[]>([]);

    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadData() {
            try {
                const { data: authData, error: authError } =
                    await supabase.auth.getUser();

                if (authError || !authData.user) {
                    throw new Error('Please sign in again.');
                }

                const [
                    profileResult,
                    departmentResult,
                    batchResult,
                ] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select(
                            'category,department_id,batch_mapping_id,program,graduation_year'
                        )
                        .eq('id', authData.user.id)
                        .single(),

                    supabase
                        .from('departments')
                        .select('id,code,name')
                        .order('name'),

                    supabase
                        .from('batch_mappings')
                        .select(
                            'id,code,admission_year,department_id'
                        )
                        .order('admission_year', {
                            ascending: false,
                        }),
                ]);

                if (profileResult.error) {
                    throw profileResult.error;
                }

                if (departmentResult.error) {
                    throw departmentResult.error;
                }

                if (batchResult.error) {
                    throw batchResult.error;
                }

                const userProfile = profileResult.data;

                setProfile(userProfile);
                setDepartments(departmentResult.data || []);
                setMappings(batchResult.data || []);

                setSelectedDepartment(
                    userProfile?.department_id || ''
                );

                setSelectedBatch(
                    userProfile?.batch_mapping_id || ''
                );
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load academic information.'
                );
            } finally {
                setLoading(false);
            }
        }

        void loadData();
    }, [supabase]);

    // Show only batches belonging to the selected department.
    const availableBatches = useMemo(() => {
        const departmentBatches = mappings.filter(
            (batch) =>
                batch.department_id === selectedDepartment
        );

        // Avoid showing the same code more than once.
        const uniqueBatches = Array.from(
            new Map(
                departmentBatches.map((batch) => [
                    batch.code,
                    batch,
                ])
            ).values()
        );

        // Newest year first, then batch number descending.
        return uniqueBatches.sort((a, b) => {
            if (a.admission_year !== b.admission_year) {
                return b.admission_year - a.admission_year;
            }

            return b.code.localeCompare(a.code, undefined, {
                numeric: true,
            });
        });
    }, [mappings, selectedDepartment]);

    function handleDepartmentChange(departmentId: string) {
        setSelectedDepartment(departmentId);

        // Reset batch when the department changes.
        setSelectedBatch('');
    }

    if (loading) {
        return (
            <div className="panel">
                <p className="muted">
                    Loading your academic information...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    const isFaculty = profile?.category === 'faculty';

    return (
        <>
            <Heading
                title="Set up your academic profile"
                subtitle="Help classmates and alumni find you."
            />

            <div className="panel">
                <div className="eyebrow mb-4">
                    Academic identity
                </div>

                <form
                    action={saveOnboarding}
                    className="space-y-4"
                >
                    <input
                        type="hidden"
                        name="category"
                        value={profile?.category || 'student'}
                    />

                    {/* Department selection */}
                    <div>
                        <label
                            htmlFor="department"
                            className="form-label"
                        >
                            Department
                        </label>

                        <select
                            id="department"
                            name="department_id"
                            className="field"
                            required
                            value={selectedDepartment}
                            onChange={(e) =>
                                handleDepartmentChange(
                                    e.target.value
                                )
                            }
                        >
                            <option value="" disabled>
                                Select department
                            </option>

                            {departments.map((department) => (
                                <option
                                    key={department.id}
                                    value={department.id}
                                >
                                    {department.name} (
                                    {department.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Batch selection */}
                    <div>
                        <label
                            htmlFor="batch"
                            className="form-label"
                        >
                            Batch {isFaculty ? '(optional)' : ''}
                        </label>

                        <select
                            id="batch"
                            name="batch_mapping_id"
                            className="field"
                            value={selectedBatch}
                            required={!isFaculty}
                            disabled={!selectedDepartment}
                            onChange={(e) =>
                                setSelectedBatch(e.target.value)
                            }
                        >
                            <option value="">
                                {isFaculty
                                    ? 'Faculty — no batch'
                                    : 'Select batch'}
                            </option>

                            {availableBatches.map((batch) => (
                                <option
                                    key={batch.id}
                                    value={batch.id}
                                >
                                    {batch.code}
                                </option>
                            ))}
                        </select>

                        <p className="muted text-xs mt-2">
                            {selectedDepartment
                                ? 'Choose your admission batch.'
                                : 'Select your department first.'}
                        </p>
                    </div>

                    {/* Program and graduation year */}
                    <div className="form-grid">
                        <div>
                            <label
                                htmlFor="program"
                                className="form-label"
                            >
                                Program (optional)
                            </label>

                            <input
                                id="program"
                                name="program"
                                className="field"
                                placeholder="e.g., BSc in CSE"
                                defaultValue={
                                    profile?.program || ''
                                }
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="graduation"
                                className="form-label"
                            >
                                {profile?.category === 'alumni'
                                    ? 'Graduation year'
                                    : 'Expected graduation year'}
                                {' '}(optional)
                            </label>

                            <input
                                id="graduation"
                                className="field"
                                type="number"
                                name="graduation_year"
                                min="1970"
                                max="2150"
                                placeholder="2027"
                                defaultValue={
                                    profile?.graduation_year || ''
                                }
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                    >
                        Save academic profile
                    </button>
                </form>

                {selectedDepartment &&
                    availableBatches.length === 0 && (
                        <div className="mt-5">
                            <Empty
                                title="No batches available"
                                subtitle="No batch mappings have been configured for this department."
                            />
                        </div>
                    )}
            </div>
        </>
    );
}
