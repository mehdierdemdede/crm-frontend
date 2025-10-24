"use client";

import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Edit3, PlusCircle, Trash2 } from "lucide-react";

interface AdItem {
    id: string;
    name: string;
}

interface AdSetItem {
    id: string;
    name: string;
    ads: AdItem[];
}

interface CampaignItem {
    id: string;
    name: string;
    adSets: AdSetItem[];
}

interface FacebookPageItem {
    id: string;
    name: string;
    campaigns: CampaignItem[];
}

interface UserItem {
    id: string;
    name: string;
    languages: string[];
    defaultFrequency?: number;
}

interface AssignmentUser {
    userId: string;
    name: string;
    frequency: number;
    languages: string[];
}

interface AssignmentRow {
    id: string;
    pageId: string;
    pageName: string;
    campaignId: string;
    campaignName: string;
    adSetId?: string;
    adSetName?: string;
    adId?: string;
    adName?: string;
    users: AssignmentUser[];
}

const FACEBOOK_PAGES: FacebookPageItem[] = [
    {
        id: "24621211450915346",
        name: "THC",
        campaigns: [
            {
                id: "120235617509050170",
                name: "FRA/PCF/2.9.25",
                adSets: [
                    {
                        id: "120235617509070170",
                        name: "FRA/PCF/2.9.25",
                        ads: [
                            { id: "2024521051639148", name: "FRA/PCF/2.9.25 - Copy" },
                            { id: "2024521051639149", name: "FRA/PCF/2.9.25 - Main" },
                        ],
                    },
                ],
            },
            {
                id: "120235617509051999",
                name: "FRA/PCF/Lookalike",
                adSets: [
                    {
                        id: "120235617509071999",
                        name: "FRA/PCF/Remarketing",
                        ads: [
                            { id: "2024521051639200", name: "Remarketing - Carousel" },
                            { id: "2024521051639201", name: "Remarketing - Video" },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: "24621211450919999",
        name: "BABA",
        campaigns: [
            {
                id: "120235617500000001",
                name: "TR/Brand Awareness",
                adSets: [
                    {
                        id: "120235617500000101",
                        name: "Genç Kitle",
                        ads: [
                            { id: "2024521051639300", name: "Awareness - 18/24" },
                            { id: "2024521051639301", name: "Awareness - 25/34" },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: "24621211450928888",
        name: "KANZAKI",
        campaigns: [
            {
                id: "120235617500100100",
                name: "DE/Lead",
                adSets: [
                    {
                        id: "120235617500100200",
                        name: "DE/Lead/Retargeting",
                        ads: [
                            { id: "2024521051639400", name: "Lead - Form" },
                        ],
                    },
                ],
            },
        ],
    },
];

const USERS: UserItem[] = [
    { id: "user-1", name: "Erdem", languages: ["TR"], defaultFrequency: 0 },
    { id: "user-2", name: "Mert", languages: ["TR", "EN"], defaultFrequency: 1 },
    { id: "user-3", name: "Hüseyin", languages: ["TR", "AR"], defaultFrequency: 2 },
    { id: "user-4", name: "Ayşe", languages: ["EN"], defaultFrequency: undefined },
    { id: "user-5", name: "Deniz", languages: ["FR", "TR"], defaultFrequency: undefined },
];

type UserSelectionMap = Record<string, { selected: boolean; frequency: number | null }>;

const createInitialUserSelections = (): UserSelectionMap => {
    return USERS.reduce<UserSelectionMap>((acc, user) => {
        acc[user.id] = {
            selected: typeof user.defaultFrequency === "number",
            frequency:
                typeof user.defaultFrequency === "number" ? user.defaultFrequency : null,
        };
        return acc;
    }, {});
};

const getNextAvailableFrequency = (map: UserSelectionMap): number => {
    const used = Object.values(map)
        .filter((item) => item.selected && item.frequency !== null)
        .map((item) => item.frequency as number);
    let candidate = 0;
    while (used.includes(candidate)) {
        candidate += 1;
    }
    return candidate;
};

export default function LeadAssignmentPage() {
    const [selectedPageId, setSelectedPageId] = useState<string>("");
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
    const [selectedAdSetId, setSelectedAdSetId] = useState<string>("");
    const [selectedAdId, setSelectedAdId] = useState<string>("");
    const [userSelections, setUserSelections] = useState<UserSelectionMap>(
        createInitialUserSelections,
    );
    const [assignments, setAssignments] = useState<AssignmentRow[]>([
        {
            id: "assignment-initial",
            pageId: "24621211450915346",
            pageName: "THC",
            campaignId: "120235617509050170",
            campaignName: "FRA/PCF/2.9.25",
            adSetId: "120235617509070170",
            adSetName: "FRA/PCF/2.9.25",
            adId: "2024521051639148",
            adName: "FRA/PCF/2.9.25 - Copy",
            users: [
                { userId: "user-1", name: "Erdem", frequency: 0, languages: ["TR"] },
                { userId: "user-2", name: "Mert", frequency: 1, languages: ["TR", "EN"] },
                { userId: "user-3", name: "Hüseyin", frequency: 2, languages: ["TR", "AR"] },
            ],
        },
    ]);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);

    const selectedPage = useMemo(
        () => FACEBOOK_PAGES.find((page) => page.id === selectedPageId) ?? null,
        [selectedPageId],
    );
    const selectedCampaign = useMemo(
        () => selectedPage?.campaigns.find((c) => c.id === selectedCampaignId) ?? null,
        [selectedPage, selectedCampaignId],
    );
    const selectedAdSet = useMemo(
        () => selectedCampaign?.adSets.find((a) => a.id === selectedAdSetId) ?? null,
        [selectedCampaign, selectedAdSetId],
    );
    const selectedAd = useMemo(
        () => selectedAdSet?.ads.find((ad) => ad.id === selectedAdId) ?? null,
        [selectedAdSet, selectedAdId],
    );

    const orderedSelectedUsers = useMemo(() => {
        return USERS.filter((user) => userSelections[user.id]?.selected)
            .map((user) => ({
                ...user,
                frequency: userSelections[user.id]?.frequency ?? null,
            }))
            .sort((a, b) => {
                const freqA = a.frequency ?? Number.MAX_SAFE_INTEGER;
                const freqB = b.frequency ?? Number.MAX_SAFE_INTEGER;
                return freqA - freqB;
            });
    }, [userSelections]);

    const resetSelections = () => {
        setSelectedCampaignId("");
        setSelectedAdSetId("");
        setSelectedAdId("");
    };

    const handlePageChange = (value: string) => {
        setSelectedPageId(value);
        resetSelections();
    };

    const handleCampaignChange = (value: string) => {
        setSelectedCampaignId(value);
        setSelectedAdSetId("");
        setSelectedAdId("");
    };

    const handleAdSetChange = (value: string) => {
        setSelectedAdSetId(value);
        setSelectedAdId("");
    };

    const handleToggleUser = (userId: string) => {
        setFormError(null);
        setFormSuccess(null);
        setUserSelections((prev) => {
            const next = { ...prev };
            const current = next[userId];
            if (!current) {
                return prev;
            }
            if (current.selected) {
                next[userId] = { selected: false, frequency: null };
            } else {
                next[userId] = {
                    selected: true,
                    frequency: getNextAvailableFrequency(prev),
                };
            }
            return next;
        });
    };

    const handleFrequencyChange = (userId: string, value: string) => {
        setFormError(null);
        setFormSuccess(null);
        let nextFrequency: number | null = null;
        if (value !== "") {
            const numericValue = Number(value);
            nextFrequency = Number.isNaN(numericValue) ? null : numericValue;
        }
        setUserSelections((prev) => ({
            ...prev,
            [userId]: {
                selected: prev[userId].selected,
                frequency: nextFrequency,
            },
        }));
    };

    const handleCreateAssignment = () => {
        setFormError(null);
        setFormSuccess(null);

        if (!selectedPageId || !selectedCampaignId) {
            setFormError("Facebook sayfası ve kampanya seçimi zorunludur.");
            return;
        }

        const selectedUsers = orderedSelectedUsers.filter(
            (user) => user.frequency !== null,
        ) as Array<UserItem & { frequency: number }>;

        if (selectedUsers.length === 0) {
            setFormError("En az bir kullanıcıyı frekans ile birlikte seçmelisiniz.");
            return;
        }

        const frequencyValues = selectedUsers.map((user) => user.frequency);
        const hasDuplicateFrequencies = new Set(frequencyValues).size !== frequencyValues.length;
        if (hasDuplicateFrequencies) {
            setFormError("Her kullanıcı için benzersiz bir frekans belirleyin (0, 1, 2 ...).");
            return;
        }

        const newAssignment: AssignmentRow = {
            id: `assignment-${Date.now()}`,
            pageId: selectedPageId,
            pageName: selectedPage?.name ?? "-",
            campaignId: selectedCampaignId,
            campaignName: selectedCampaign?.name ?? "-",
            adSetId: selectedAdSetId || undefined,
            adSetName: selectedAdSet?.name,
            adId: selectedAdId || undefined,
            adName: selectedAd?.name,
            users: selectedUsers.map((user) => ({
                userId: user.id,
                name: user.name,
                frequency: user.frequency,
                languages: user.languages,
            })),
        };

        setAssignments((prev) => [...prev, newAssignment]);
        setFormSuccess("Atama listesine başarıyla eklendi.");
    };

    const handleDeleteAssignment = (assignmentId: string) => {
        setAssignments((prev) => prev.filter((assignment) => assignment.id !== assignmentId));
    };

    const canCreateAssignment = useMemo(() => {
        if (!selectedPageId || !selectedCampaignId) {
            return false;
        }
        const validUsers = orderedSelectedUsers.filter((user) => user.frequency !== null);
        if (validUsers.length === 0) {
            return false;
        }
        const frequencies = validUsers.map((user) => user.frequency as number);
        return new Set(frequencies).size === frequencies.length;
    }, [orderedSelectedUsers, selectedCampaignId, selectedPageId]);

    return (
        <Layout
            title="Lead Assignment"
            subtitle="Facebook reklamlarınız için kullanıcı bazlı auto-assign kurallarını yönetin"
        >
            <div className="col-span-12 lg:col-span-5 space-y-4">
                <Card>
                    <CardHeader>Kaynak Seçimleri</CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Facebook Sayfasını Seçiniz <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedPageId}
                                onChange={(event) => handlePageChange(event.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            >
                                <option value="">Sayfa seçiniz</option>
                                {FACEBOOK_PAGES.map((page) => (
                                    <option key={page.id} value={page.id}>
                                        {page.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Kampanya Seçiniz <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedCampaignId}
                                onChange={(event) => handleCampaignChange(event.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                disabled={!selectedPage}
                            >
                                <option value="">
                                    {selectedPage ? "Kampanya seçiniz" : "Önce Facebook sayfasını seçin"}
                                </option>
                                {selectedPage?.campaigns.map((campaign) => (
                                    <option key={campaign.id} value={campaign.id}>
                                        {campaign.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Reklam Seti Seçiniz
                            </label>
                            <select
                                value={selectedAdSetId}
                                onChange={(event) => handleAdSetChange(event.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                disabled={!selectedCampaign}
                            >
                                <option value="">
                                    {selectedCampaign
                                        ? "Reklam seti seçiniz (opsiyonel)"
                                        : "Önce kampanya seçin"}
                                </option>
                                {selectedCampaign?.adSets.map((adSet) => (
                                    <option key={adSet.id} value={adSet.id}>
                                        {adSet.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Reklam Seçiniz
                            </label>
                            <select
                                value={selectedAdId}
                                onChange={(event) => setSelectedAdId(event.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                disabled={!selectedAdSet}
                            >
                                <option value="">
                                    {selectedAdSet
                                        ? "Reklam seçiniz (opsiyonel)"
                                        : "Önce reklam seti seçin"}
                                </option>
                                {selectedAdSet?.ads.map((ad) => (
                                    <option key={ad.id} value={ad.id}>
                                        {ad.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                            Sayfa ve kampanya seçimleri zorunludur. Reklam seti ve reklam seçenekleri
                            opsiyoneldir; seçtiğiniz takdirde atamalar sadece bu filtrelere özel
                            çalışacaktır.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>Auto Assign Kullanıcıları</CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-xs text-gray-600">
                            Frequency değeri, gelen lead sıralamasını belirler. Örneğin frekansı 0 olan
                            kullanıcı ilk lead&apos;i alır, 1 ve 2 olan kullanıcılar sıradaki lead&apos;leri alır ve
                            sıra tekrar başa döner.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                                    <th className="px-2 py-2">İsim</th>
                                    <th className="px-2 py-2">Diller</th>
                                    <th className="px-2 py-2">Frequency</th>
                                    <th className="px-2 py-2 text-center">Auto Assign</th>
                                </tr>
                                </thead>
                                <tbody>
                                {USERS.map((user) => {
                                    const state = userSelections[user.id];
                                    return (
                                        <tr key={user.id} className="border-t">
                                            <td className="px-2 py-2 font-medium text-gray-800">{user.name}</td>
                                            <td className="px-2 py-2 text-gray-600">
                                                {user.languages.join(", ")}
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={state.frequency ?? ""}
                                                    onChange={(event) =>
                                                        handleFrequencyChange(user.id, event.target.value)
                                                    }
                                                    className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                                                    disabled={!state.selected}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={state.selected}
                                                    onChange={() => handleToggleUser(user.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                        {formError && <p className="text-xs text-red-600">{formError}</p>}
                        {formSuccess && <p className="text-xs text-green-600">{formSuccess}</p>}
                        <Button
                            type="button"
                            variant="primary"
                            className="w-full justify-center"
                            onClick={handleCreateAssignment}
                            disabled={!canCreateAssignment}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Atamayı Kaydet
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="col-span-12 lg:col-span-7">
                <Card>
                    <CardHeader>Atama Özeti</CardHeader>
                    <CardContent>
                        {assignments.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Henüz tanımlanmış bir auto-assign kuralı yok. Soldaki formu kullanarak ilk
                                atamanızı ekleyin.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                    <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                                        <th className="px-3 py-2">Facebook Kanalı</th>
                                        <th className="px-3 py-2">Kampanya</th>
                                        <th className="px-3 py-2">Reklam Seti</th>
                                        <th className="px-3 py-2">Reklam</th>
                                        <th className="px-3 py-2">Sorumlular</th>
                                        <th className="px-3 py-2 text-right">İşlem</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {assignments.map((assignment) => (
                                        <tr key={assignment.id} className="border-t align-top">
                                            <td className="px-3 py-2 font-medium text-gray-800">
                                                <div>{assignment.pageName}</div>
                                                <div className="text-xs text-gray-500">ID: {assignment.pageId}</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-800">{assignment.campaignName}</div>
                                                <div className="text-xs text-gray-500">ID: {assignment.campaignId}</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                {assignment.adSetName ? (
                                                    <>
                                                        <div className="font-medium text-gray-800">{assignment.adSetName}</div>
                                                        <div className="text-xs text-gray-500">
                                                            ID: {assignment.adSetId}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {assignment.adName ? (
                                                    <>
                                                        <div className="font-medium text-gray-800">{assignment.adName}</div>
                                                        <div className="text-xs text-gray-500">
                                                            ID: {assignment.adId}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <ul className="space-y-1">
                                                    {[...assignment.users]
                                                        .sort((a, b) => a.frequency - b.frequency)
                                                        .map((user) => (
                                                            <li key={`${assignment.id}-${user.userId}-${user.frequency}`}>
                                                                <span className="font-medium text-gray-800">
                                                                    {user.frequency}
                                                                </span>{" "}
                                                                <span className="text-gray-700">{user.name}</span>
                                                                <span className="ml-2 text-xs text-gray-500">
                                                                    ({user.languages.join(", ")})
                                                                </span>
                                                            </li>
                                                        ))}
                                                </ul>
                                            </td>
                                            <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                                                <Button variant="ghost" size="sm" className="inline-flex items-center gap-1 text-gray-600" disabled>
                                                    <Edit3 className="h-4 w-4" /> Edit
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    className="inline-flex items-center gap-1"
                                                    onClick={() => handleDeleteAssignment(assignment.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" /> Delete
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

