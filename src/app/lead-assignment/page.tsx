"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { LanguageFlagIcon } from "@/components/LanguageFlagIcon";
import {
    deleteFacebookLeadRule,
    getAutoAssignStats,
    getFacebookLeadRules,
    getFacebookLeadTree,
    saveFacebookLeadRule,
    type AgentStatsResponse,
    type FacebookLeadRule,
    type FacebookLeadTreeAd,
    type FacebookLeadTreeAdset,
    type FacebookLeadTreeCampaign,
    type FacebookLeadTreePage,
    type SaveFacebookLeadRuleRequest,
} from "@/lib/api";
import { useLanguages } from "@/contexts/LanguageContext";
import { enhanceLanguageOption } from "@/lib/languages";
import { ChevronDown, ChevronUp, Edit3, Loader2, PlusCircle, Trash2 } from "lucide-react";

interface UserSelectionState {
    selected: boolean;
    frequency: number | "";
}

const sortRules = (items: FacebookLeadRule[]): FacebookLeadRule[] => {
    const safeLabel = (value?: string | null, fallback?: string) =>
        value && value.trim().length > 0 ? value : fallback ?? "";

    return [...items].sort((a, b) => {
        const keyA = `${safeLabel(a.pageName, a.pageId)}|${safeLabel(
            a.campaignName,
            a.campaignId,
        )}|${safeLabel(a.adsetName, a.adsetId)}|${safeLabel(a.adName, a.adId)}`;
        const keyB = `${safeLabel(b.pageName, b.pageId)}|${safeLabel(
            b.campaignName,
            b.campaignId,
        )}|${safeLabel(b.adsetName, b.adsetId)}|${safeLabel(b.adName, b.adId)}`;
        return keyA.localeCompare(keyB, "tr");
    });
};

const formatLabel = (name?: string | null, id?: string) =>
    name && name.trim().length > 0 ? name : id ?? "-";

export default function LeadAssignmentPage() {
    const [pages, setPages] = useState<FacebookLeadTreePage[]>([]);
    const [rules, setRules] = useState<FacebookLeadRule[]>([]);
    const [agents, setAgents] = useState<AgentStatsResponse[]>([]);

    const [selectedPageId, setSelectedPageId] = useState<string>("");
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
    const [selectedAdSetId, setSelectedAdSetId] = useState<string>("");
    const [selectedAdId, setSelectedAdId] = useState<string>("");

    const [userSelections, setUserSelections] = useState<Record<string, UserSelectionState>>({});
    const [selectedUserOrder, setSelectedUserOrder] = useState<string[]>([]);
    const [currentRuleId, setCurrentRuleId] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const { getOptionByCode } = useLanguages();

    const refreshTree = useCallback(async () => {
        try {
            const response = await getFacebookLeadTree();
            setPages(response?.pages ?? []);
        } catch (error) {
            console.error("facebook lead tree refresh error", error);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [treeResponse, ruleResponse, agentResponse] = await Promise.all([
                    getFacebookLeadTree(),
                    getFacebookLeadRules(),
                    getAutoAssignStats(),
                ]);

                setPages(treeResponse?.pages ?? []);
                setRules(sortRules(ruleResponse ?? []));
                setAgents(agentResponse ?? []);
            } catch (error) {
                console.error("lead-assignment load error", error);
                setFormError(
                    error instanceof Error
                        ? error.message
                        : "Veriler yüklenirken bir hata oluştu."
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        if (agents.length === 0) {
            setUserSelections({});
            setSelectedUserOrder([]);
            return;
        }

        setUserSelections((prev) => {
            const next: Record<string, UserSelectionState> = {};
            agents.forEach((agent) => {
                const existing = prev[agent.userId];
                next[agent.userId] = existing
                    ? { ...existing }
                    : { selected: false, frequency: 1 };
            });
            return next;
        });

        setSelectedUserOrder((prevOrder) =>
            prevOrder.filter((id) => agents.some((agent) => agent.userId === id)),
        );
    }, [agents]);

    const selectedPage: FacebookLeadTreePage | null = useMemo(
        () => pages.find((page) => page.pageId === selectedPageId) ?? null,
        [pages, selectedPageId],
    );

    const selectedCampaign: FacebookLeadTreeCampaign | null = useMemo(
        () =>
            selectedPage?.campaigns.find(
                (campaign) => campaign.campaignId === selectedCampaignId,
            ) ?? null,
        [selectedPage, selectedCampaignId],
    );

    const selectedAdSet: FacebookLeadTreeAdset | null = useMemo(
        () =>
            selectedCampaign?.adsets.find((adset) => adset.adsetId === selectedAdSetId) ??
            null,
        [selectedCampaign, selectedAdSetId],
    );

    const selectedAd: FacebookLeadTreeAd | null = useMemo(
        () => selectedAdSet?.ads.find((ad) => ad.adId === selectedAdId) ?? null,
        [selectedAdSet, selectedAdId],
    );

    useEffect(() => {
        if (
            !selectedPageId ||
            !selectedCampaignId ||
            !selectedAdSetId ||
            !selectedAdId ||
            agents.length === 0
        ) {
            setCurrentRuleId(null);
            setSelectedUserOrder([]);
            setUserSelections((prev) => {
                const next: Record<string, UserSelectionState> = {};
                Object.entries(prev).forEach(([id, state]) => {
                    next[id] = { ...state, selected: false };
                });
                return next;
            });
            return;
        }

        const existingRule = rules.find(
            (rule) =>
                rule.pageId === selectedPageId &&
                rule.campaignId === selectedCampaignId &&
                rule.adsetId === selectedAdSetId &&
                rule.adId === selectedAdId,
        );

        if (!existingRule) {
            setCurrentRuleId(null);
            setSelectedUserOrder([]);
            setUserSelections((prev) => {
                const next: Record<string, UserSelectionState> = {};
                Object.entries(prev).forEach(([id, state]) => {
                    next[id] = { ...state, selected: false };
                });
                return next;
            });
            return;
        }

        const orderedAssignments = [...existingRule.assignments].sort(
            (a, b) => a.position - b.position,
        );
        setCurrentRuleId(existingRule.id);
        setSelectedUserOrder(orderedAssignments.map((assignment) => assignment.userId));
        setUserSelections((prev) => {
            const next: Record<string, UserSelectionState> = { ...prev };
            const assignedIds = new Set(orderedAssignments.map((assignment) => assignment.userId));

            Object.keys(next).forEach((id) => {
                if (assignedIds.has(id)) {
                    const assignment = orderedAssignments.find((item) => item.userId === id);
                    next[id] = {
                        selected: true,
                        frequency: assignment ? assignment.frequency : 1,
                    };
                } else {
                    next[id] = { ...next[id], selected: false };
                }
            });

            orderedAssignments.forEach((assignment) => {
                if (!next[assignment.userId]) {
                    next[assignment.userId] = {
                        selected: true,
                        frequency: assignment.frequency,
                    };
                }
            });

            return next;
        });
    }, [
        agents.length,
        rules,
        selectedAdId,
        selectedAdSetId,
        selectedCampaignId,
        selectedPageId,
    ]);

    const sortedAgents = useMemo(
        () => [...agents].sort((a, b) => a.fullName.localeCompare(b.fullName, "tr")),
        [agents],
    );

    const resetSelections = () => {
        setSelectedCampaignId("");
        setSelectedAdSetId("");
        setSelectedAdId("");
    };

    const handlePageChange = (value: string) => {
        setFormError(null);
        setFormSuccess(null);
        setSelectedPageId(value);
        resetSelections();
    };

    const handleCampaignChange = (value: string) => {
        setFormError(null);
        setFormSuccess(null);
        setSelectedCampaignId(value);
        setSelectedAdSetId("");
        setSelectedAdId("");
    };

    const handleAdSetChange = (value: string) => {
        setFormError(null);
        setFormSuccess(null);
        setSelectedAdSetId(value);
        setSelectedAdId("");
    };

    const handleAdChange = (value: string) => {
        setFormError(null);
        setFormSuccess(null);
        setSelectedAdId(value);
    };

    const handleToggleUser = (userId: string) => {
        const currentState = userSelections[userId];
        const currentlySelected = currentState?.selected ?? false;

        setFormError(null);
        setFormSuccess(null);

        setUserSelections((prev) => {
            const next = { ...prev };
            const existing = next[userId] ?? { selected: false, frequency: 1 };
            next[userId] = currentlySelected
                ? { ...existing, selected: false }
                : {
                      selected: true,
                      frequency:
                          typeof existing.frequency === "number" && existing.frequency >= 1
                              ? existing.frequency
                              : 1,
                  };
            return next;
        });

        setSelectedUserOrder((prev) => {
            if (currentlySelected) {
                return prev.filter((id) => id !== userId);
            }
            if (prev.includes(userId)) {
                return prev;
            }
            return [...prev, userId];
        });
    };

    const handleFrequencyChange = (userId: string, value: string) => {
        setFormError(null);
        setFormSuccess(null);

        setUserSelections((prev) => {
            const next = { ...prev };
            const existing = next[userId] ?? { selected: false, frequency: 1 };
            if (value === "") {
                next[userId] = { ...existing, frequency: "" };
                return next;
            }

            const numericValue = Number(value);
            if (Number.isNaN(numericValue)) {
                return next;
            }

            next[userId] = {
                ...existing,
                frequency: numericValue,
            };
            return next;
        });
    };

    const handleMoveUser = (userId: string, direction: "up" | "down") => {
        setFormError(null);
        setFormSuccess(null);

        setSelectedUserOrder((prev) => {
            const index = prev.indexOf(userId);
            if (index === -1) {
                return prev;
            }

            const nextIndex = direction === "up" ? index - 1 : index + 1;
            if (nextIndex < 0 || nextIndex >= prev.length) {
                return prev;
            }

            const next = [...prev];
            const [removed] = next.splice(index, 1);
            next.splice(nextIndex, 0, removed);
            return next;
        });
    };

    const selectedAssignmentsForPayload = useMemo(
        () =>
            selectedUserOrder
                .map((userId, index) => {
                    const selection = userSelections[userId];
                    if (!selection?.selected) {
                        return null;
                    }
                    if (typeof selection.frequency !== "number" || selection.frequency < 1) {
                        return null;
                    }
                    return {
                        userId,
                        frequency: selection.frequency,
                        position: index,
                    };
                })
                .filter(Boolean) as Array<{ userId: string; frequency: number; position: number }>,
        [selectedUserOrder, userSelections],
    );

    const canSaveRule = useMemo(() => {
        if (
            !selectedPageId ||
            !selectedCampaignId ||
            !selectedAdSetId ||
            !selectedAdId ||
            selectedAssignmentsForPayload.length === 0
        ) {
            return false;
        }

        return selectedAssignmentsForPayload.every(
            (assignment) => assignment.frequency && assignment.frequency >= 1,
        );
    }, [
        selectedPageId,
        selectedCampaignId,
        selectedAdSetId,
        selectedAdId,
        selectedAssignmentsForPayload,
    ]);

    const handleSaveRule = async () => {
        setFormError(null);
        setFormSuccess(null);

        if (!selectedPageId || !selectedCampaignId || !selectedAdSetId || !selectedAdId) {
            setFormError("Sayfa, kampanya, reklam seti ve reklam seçimleri zorunludur.");
            return;
        }

        if (selectedAssignmentsForPayload.length === 0) {
            setFormError("En az bir kullanıcıyı frekans ile birlikte seçmelisiniz.");
            return;
        }

        const invalidFrequency = selectedAssignmentsForPayload.some(
            (assignment) => assignment.frequency < 1,
        );
        if (invalidFrequency) {
            setFormError("Frekans değeri 1 veya daha büyük olmalıdır.");
            return;
        }

        const payload: SaveFacebookLeadRuleRequest = {
            pageId: selectedPageId,
            campaignId: selectedCampaignId,
            adsetId: selectedAdSetId,
            adId: selectedAdId,
            ...(selectedPage?.pageName ? { pageName: selectedPage.pageName } : {}),
            ...(selectedCampaign?.campaignName ? { campaignName: selectedCampaign.campaignName } : {}),
            ...(selectedAdSet?.adsetName ? { adsetName: selectedAdSet.adsetName } : {}),
            ...(selectedAd?.adName ? { adName: selectedAd.adName } : {}),
            assignments: selectedAssignmentsForPayload,
        };

        const updatingExisting = currentRuleId !== null;

        setIsSaving(true);
        try {
            const savedRule = await saveFacebookLeadRule(payload);
            if (!savedRule) {
                throw new Error("Kural kaydedilemedi.");
            }

            setRules((prev) =>
                sortRules([...prev.filter((rule) => rule.id !== savedRule.id), savedRule]),
            );
            setCurrentRuleId(savedRule.id);
            setFormSuccess(
                updatingExisting
                    ? "Kural başarıyla güncellendi."
                    : "Kural başarıyla oluşturuldu.",
            );
            await refreshTree();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Kural kaydedilirken bir hata oluştu.";
            setFormError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        setFormError(null);
        setFormSuccess(null);
        setDeletingRuleId(ruleId);

        try {
            await deleteFacebookLeadRule(ruleId);
            setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
            if (currentRuleId === ruleId) {
                setCurrentRuleId(null);
                setSelectedUserOrder([]);
                setUserSelections((prev) => {
                    const next: Record<string, UserSelectionState> = {};
                    Object.entries(prev).forEach(([id, state]) => {
                        next[id] = { ...state, selected: false };
                    });
                    return next;
                });
            }
            setFormSuccess("Kural başarıyla silindi.");
            await refreshTree();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Kural silinirken bir hata oluştu.";
            setFormError(message);
        } finally {
            setDeletingRuleId(null);
        }
    };

    const handleEditRule = (rule: FacebookLeadRule) => {
        setFormError(null);
        setFormSuccess(null);
        setSelectedPageId(rule.pageId);
        setSelectedCampaignId(rule.campaignId);
        setSelectedAdSetId(rule.adsetId);
        setSelectedAdId(rule.adId);
    };

    const ruleList = rules;

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
                                disabled={isLoading || pages.length === 0}
                            >
                                <option value="">
                                    {isLoading ? "Yükleniyor..." : "Sayfa seçiniz"}
                                </option>
                                {pages.map((page) => (
                                    <option key={page.pageId} value={page.pageId}>
                                        {formatLabel(page.pageName, page.pageId)}
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
                                disabled={isLoading || !selectedPage}
                            >
                                <option value="">
                                    {selectedPage
                                        ? "Kampanya seçiniz"
                                        : "Önce Facebook sayfasını seçin"}
                                </option>
                                {selectedPage?.campaigns.map((campaign) => (
                                    <option key={campaign.campaignId} value={campaign.campaignId}>
                                        {formatLabel(campaign.campaignName, campaign.campaignId)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Reklam Seti Seçiniz <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedAdSetId}
                                onChange={(event) => handleAdSetChange(event.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                disabled={isLoading || !selectedCampaign}
                            >
                                <option value="">
                                    {selectedCampaign
                                        ? "Reklam seti seçiniz"
                                        : "Önce kampanya seçin"}
                                </option>
                                {selectedCampaign?.adsets.map((adset) => (
                                    <option key={adset.adsetId} value={adset.adsetId}>
                                        {formatLabel(adset.adsetName, adset.adsetId)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Reklam Seçiniz <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedAdId}
                                onChange={(event) => handleAdChange(event.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                disabled={isLoading || !selectedAdSet}
                            >
                                <option value="">
                                    {selectedAdSet ? "Reklam seçiniz" : "Önce reklam seti seçin"}
                                </option>
                                {selectedAdSet?.ads.map((ad) => (
                                    <option key={ad.adId} value={ad.adId}>
                                        {formatLabel(ad.adName, ad.adId)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                            Tüm seçimler zorunludur. Seçili kombinasyon için kural kaydettiğinizde aynı
                            reklamdan gelen lead&apos;ler burada tanımlanan sırayla dağıtılır.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>Auto Assign Kullanıcıları</CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-xs text-gray-600">
                            Frekans değeri, kullanıcıya arka arkaya kaç lead verileceğini; sıra değeri
                            ise rotasyondaki konumunu belirler. Tüm frekanslar 1 veya daha büyük
                            olmalıdır.
                        </p>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-6 text-gray-500">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Veriler yükleniyor...
                            </div>
                        ) : sortedAgents.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Auto-assign özelliği açık kullanıcı bulunamadı. Kullanıcı ekledikten sonra
                                kuralları yapılandırabilirsiniz.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                                            <th className="px-2 py-2">İsim</th>
                                            <th className="px-2 py-2">Diller</th>
                                            <th className="px-2 py-2">Frekans</th>
                                            <th className="px-2 py-2">Sıra</th>
                                            <th className="px-2 py-2 text-center">Kurala Dahil</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedAgents.map((agent) => {
                                            const selection = userSelections[agent.userId];
                                            const isSelected = selection?.selected ?? false;
                                            const orderIndex = selectedUserOrder.indexOf(agent.userId);
                                            const isSelectable = agent.active && agent.autoAssignEnabled;
                                            const disableCheckbox = !isSelectable && !isSelected;
                                            const checkboxTitle = !agent.active
                                                ? "Kullanıcı pasif olduğu için otomatik atamaya dahil edilemez."
                                                : !agent.autoAssignEnabled
                                                ? "Auto-assign özelliği kapalı."
                                                : undefined;

                                            return (
                                                <tr key={agent.userId} className="border-t align-top">
                                                    <td className="px-2 py-2">
                                                        <div className="font-medium text-gray-800">
                                                            {agent.fullName}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-1 text-xs">
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 ${
                                                                    agent.active
                                                                        ? "bg-green-100 text-green-700"
                                                                        : "bg-red-100 text-red-700"
                                                                }`}
                                                            >
                                                                {agent.active ? "Aktif" : "Pasif"}
                                                            </span>
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 ${
                                                                    agent.autoAssignEnabled
                                                                        ? "bg-blue-100 text-blue-700"
                                                                        : "bg-gray-200 text-gray-600"
                                                                }`}
                                                            >
                                                                {agent.autoAssignEnabled
                                                                    ? "Auto-Assign Açık"
                                                                    : "Auto-Assign Kapalı"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2 text-gray-600">
                                                        <div className="flex flex-wrap gap-1">
                                                            {agent.supportedLanguages.map((code) => {
                                                                const option =
                                                                    getOptionByCode(code) ??
                                                                    enhanceLanguageOption({
                                                                        value: code,
                                                                        label: code,
                                                                    });
                                                                return (
                                                                    <span
                                                                        key={`${agent.userId}-${code}`}
                                                                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                                                                    >
                                                                        <LanguageFlagIcon
                                                                            option={option}
                                                                            size={14}
                                                                        />
                                                                        <span>{option.label ?? code}</span>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={selection?.frequency ?? ""}
                                                            onChange={(event) =>
                                                                handleFrequencyChange(
                                                                    agent.userId,
                                                                    event.target.value,
                                                                )
                                                            }
                                                            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                                                            disabled={!isSelected}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        {isSelected ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-gray-800">
                                                                    {orderIndex + 1}.
                                                                </span>
                                                                <div className="flex flex-col gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleMoveUser(agent.userId, "up")
                                                                        }
                                                                        disabled={orderIndex <= 0}
                                                                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
                                                                    >
                                                                        <ChevronUp className="h-3 w-3" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleMoveUser(agent.userId, "down")
                                                                        }
                                                                        disabled={
                                                                            orderIndex ===
                                                                            selectedUserOrder.length - 1
                                                                        }
                                                                        className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
                                                                    >
                                                                        <ChevronDown className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleUser(agent.userId)}
                                                            disabled={disableCheckbox}
                                                            title={checkboxTitle}
                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {formError && <p className="text-xs text-red-600">{formError}</p>}
                        {formSuccess && <p className="text-xs text-green-600">{formSuccess}</p>}
                        <Button
                            type="button"
                            variant="primary"
                            className="w-full justify-center"
                            onClick={handleSaveRule}
                            disabled={!canSaveRule || isSaving || sortedAgents.length === 0}
                            isLoading={isSaving}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Kuralı Kaydet
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="col-span-12 lg:col-span-7">
                <Card>
                    <CardHeader>Atama Özeti</CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10 text-gray-500">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Veriler yükleniyor...
                            </div>
                        ) : ruleList.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Henüz tanımlanmış bir auto-assign kuralı yok. Soldaki formu kullanarak ilk
                                kuralınızı oluşturabilirsiniz.
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
                                        {ruleList.map((rule) => {
                                            const isActiveRule = rule.id === currentRuleId;
                                            const orderedAssignments = [...rule.assignments].sort(
                                                (a, b) => a.position - b.position,
                                            );

                                            return (
                                                <tr
                                                    key={rule.id}
                                                    className={`border-t align-top ${
                                                        isActiveRule ? "bg-blue-50" : ""
                                                    }`}
                                                >
                                                    <td className="px-3 py-2 font-medium text-gray-800">
                                                        <div>{formatLabel(rule.pageName, rule.pageId)}</div>
                                                        <div className="text-xs text-gray-500">
                                                            ID: {rule.pageId}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium text-gray-800">
                                                            {formatLabel(rule.campaignName, rule.campaignId)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            ID: {rule.campaignId}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium text-gray-800">
                                                            {formatLabel(rule.adsetName, rule.adsetId)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            ID: {rule.adsetId}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium text-gray-800">
                                                            {formatLabel(rule.adName, rule.adId)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            ID: {rule.adId}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {orderedAssignments.length === 0 ? (
                                                            <span className="text-xs text-gray-500">
                                                                Kullanıcı tanımlı değil.
                                                            </span>
                                                        ) : (
                                                            <ul className="space-y-2">
                                                                {orderedAssignments.map((assignment) => (
                                                                    <li key={`${rule.id}-${assignment.userId}`}>
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-medium text-gray-800">
                                                                                    {assignment.position + 1}.
                                                                                </span>
                                                                                <span className="text-gray-800">
                                                                                    {assignment.fullName}
                                                                                </span>
                                                                                <span className="text-xs text-gray-500">
                                                                                    Frekans: {assignment.frequency}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1 text-xs">
                                                                                {!assignment.active && (
                                                                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                                                                                        Pasif
                                                                                    </span>
                                                                                )}
                                                                                {!assignment.autoAssignEnabled && (
                                                                                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-600">
                                                                                        Auto-Assign Kapalı
                                                                                    </span>
                                                                                )}
                                                                                {assignment.email && (
                                                                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                                                                                        {assignment.email}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="inline-flex items-center gap-1 text-gray-600"
                                                            onClick={() => handleEditRule(rule)}
                                                        >
                                                            <Edit3 className="h-4 w-4" /> Düzenle
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            className="inline-flex items-center gap-1"
                                                            onClick={() => handleDeleteRule(rule.id)}
                                                            disabled={deletingRuleId === rule.id}
                                                        >
                                                            {deletingRuleId === rule.id ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                            Sil
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
