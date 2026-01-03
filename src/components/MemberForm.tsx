"use client";

import { useEffect, useId, useState } from "react";

import { Organization } from "@/lib/api";

import { Button } from "./Button";


type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface MemberFormData {
    id?: string | number;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;

    dailyCapacity: number;
    active: boolean;
    autoAssignEnabled: boolean;
    organizationId?: string;
}

const defaultFormValues: MemberFormData = {
    firstName: "",
    lastName: "",
    email: "",
    role: "USER",

    dailyCapacity: 10,
    active: true,
    autoAssignEnabled: true,
};

const withDefaults = (data?: MemberFormData): MemberFormData => ({
    ...defaultFormValues,
    ...data,

});

export default function MemberForm({
    initialData,
    onSubmit,
    onCancel,
    loading,
    organizations,
}: {
    initialData?: MemberFormData;
    onSubmit: (data: MemberFormData) => void;
    onCancel: () => void;
    loading?: boolean;
    organizations?: Organization[];
}) {
    const [form, setForm] = useState<MemberFormData>(withDefaults(initialData));


    useEffect(() => {
        setForm(withDefaults(initialData));
    }, [initialData]);



    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    const idPrefix = useId();
    const firstNameId = `${idPrefix}-first-name`;
    const lastNameId = `${idPrefix}-last-name`;
    const emailId = `${idPrefix}-email`;
    const roleId = `${idPrefix}-role`;

    const dailyCapacityId = `${idPrefix}-daily-capacity`;
    const activeId = `${idPrefix}-active`;
    const autoAssignId = `${idPrefix}-auto-assign`;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor={firstNameId}>
                        Ad
                    </label>
                    <input
                        type="text"
                        id={firstNameId}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm !text-gray-900 !bg-white focus:border-blue-500 focus:outline-none"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor={lastNameId}>
                        Soyad
                    </label>
                    <input
                        type="text"
                        id={lastNameId}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm !text-gray-900 !bg-white focus:border-blue-500 focus:outline-none"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor={emailId}>
                        Email
                    </label>
                    <input
                        type="email"
                        id={emailId}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm !text-gray-900 !bg-white focus:border-blue-500 focus:outline-none"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor={roleId}>
                        Rol
                    </label>
                    <select
                        id={roleId}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm !text-gray-900 !bg-white focus:border-blue-500 focus:outline-none"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                </div>
            </div>

            {organizations && organizations.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="organization-select">
                        Organizasyon
                    </label>
                    <select
                        id="organization-select"
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm !text-gray-900 !bg-white focus:border-blue-500 focus:outline-none"
                        value={form.organizationId || ""}
                        onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
                    >
                        <option value="">Seçiniz ({organizations.length} Organizasyon)</option>
                        {organizations.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Super Admin olarak kullanıcıyı belirli bir organizasyona atayabilirsiniz.</p>
                </div>
            )}



            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor={dailyCapacityId}>
                        Günlük Kapasite
                    </label>
                    <input
                        type="number"
                        min={0}
                        id={dailyCapacityId}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm !text-gray-900 !bg-white focus:border-blue-500 focus:outline-none"
                        value={form.dailyCapacity}
                        onChange={(e) =>
                            setForm({ ...form, dailyCapacity: Number(e.target.value) })
                        }
                        required
                    />
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            id={activeId}
                            checked={form.active}
                            onChange={(e) => setForm({ ...form, active: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <label htmlFor={activeId}>Aktif</label>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            id={autoAssignId}
                            checked={form.autoAssignEnabled}
                            onChange={(e) => setForm({ ...form, autoAssignEnabled: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <label htmlFor={autoAssignId}>Otomatik Atama</label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                    İptal
                </Button>
                <Button type="submit" variant="primary" isLoading={loading}>
                    Kaydet
                </Button>
            </div>
        </form>
    );
}
