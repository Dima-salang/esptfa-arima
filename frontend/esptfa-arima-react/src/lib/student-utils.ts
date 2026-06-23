export function getTruePercentage(
    sumScoresOrObj: number | undefined | null | { sum_scores?: number; max_possible_score?: number; mean?: number },
    maxPossibleScore?: number | undefined | null,
    fallbackMean?: number | null
): number {
    if (sumScoresOrObj && typeof sumScoresOrObj === 'object') {
        const max = sumScoresOrObj.max_possible_score;
        const sum = sumScoresOrObj.sum_scores || 0;
        if (max && max > 0) {
            return (sum / max) * 100;
        }
        return sumScoresOrObj.mean || 0;
    }
    
    if (maxPossibleScore && maxPossibleScore > 0) {
        const sum = (sumScoresOrObj as number) || 0;
        return (sum / maxPossibleScore) * 100;
    }
    return fallbackMean || 0;
}

export type LearnerStatus = 'Mastery Learners' | 'Monitoring Learners' | 'Priority Support Learners';

export function getLearnerStatus(percent: number): LearnerStatus {
    if (percent >= 81) return 'Mastery Learners';
    if (percent >= 70) return 'Monitoring Learners';
    return 'Priority Support Learners';
}

export function normalizeStatus(status: string | null | undefined): LearnerStatus {
    if (!status) return 'Priority Support Learners';
    const s = status.trim().toLowerCase();
    if (s === 'pass' || s === 'passed') {
        return 'Monitoring Learners';
    }
    if (s === 'fail' || s === 'failed') {
        return 'Priority Support Learners';
    }
    if (s.includes('mastery')) return 'Mastery Learners';
    if (s.includes('monitoring')) return 'Monitoring Learners';
    if (s.includes('priority') || s.includes('support')) return 'Priority Support Learners';
    return 'Priority Support Learners';
}

export function getStatusTextClass(status: string | null | undefined): string {
    const norm = normalizeStatus(status);
    if (norm === 'Mastery Learners') return 'text-emerald-700';
    if (norm === 'Monitoring Learners') return 'text-amber-700';
    return 'text-rose-700';
}

export function getStatusBgClass(status: string | null | undefined): string {
    const norm = normalizeStatus(status);
    if (norm === 'Mastery Learners') return 'bg-emerald-100/80 text-emerald-700';
    if (norm === 'Monitoring Learners') return 'bg-amber-100/80 text-amber-700';
    return 'bg-rose-100/80 text-rose-700';
}

export function getStatusSolidBgClass(status: string | null | undefined): string {
    const norm = normalizeStatus(status);
    if (norm === 'Mastery Learners') return 'bg-emerald-500 text-white';
    if (norm === 'Monitoring Learners') return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
}

export function getScoreColorClass(percent: number): string {
    if (percent >= 81) return "text-emerald-600";
    if (percent >= 70) return "text-amber-500";
    return "text-red-600";
}

export function getScoreColorHex(percent: number): string {
    if (percent >= 81) return "#10b981";
    if (percent >= 70) return "#f59e0b";
    return "#ef4444";
}

export function getInterventionTheme(percent: number | null | undefined): {
    badge: string;
    container: string;
    bgClass: string;
} {
    if (percent === null || percent === undefined) {
        return {
            badge: "bg-slate-50 text-slate-700 border-slate-200/50",
            container: "bg-slate-50/50 border-slate-100/50 text-slate-700",
            bgClass: "bg-slate-50 text-slate-700 border-slate-200/50"
        };
    }
    if (percent < 70) {
        return {
            badge: "bg-rose-100 text-rose-700 border-rose-200/50",
            container: "bg-rose-50/50 border-rose-100/40 text-rose-900",
            bgClass: "bg-rose-50 text-rose-700 border-rose-200/50"
        };
    }
    if (percent < 81) {
        return {
            badge: "bg-orange-100 text-orange-700 border-orange-200/50",
            container: "bg-orange-50/50 border-orange-100/40 text-orange-900",
            bgClass: "bg-orange-50 text-orange-700 border-orange-200/50"
        };
    }
    return {
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200/50",
        container: "bg-emerald-50/50 border-emerald-100/40 text-emerald-900",
        bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200/50"
    };
}

export interface InterventionInfo {
    label: string;
    description: string;
}

export function mapIntervention(label: string): InterventionInfo {
    const cleanLabel = label.trim().toLowerCase();
    if (cleanLabel.includes("remedial") || cleanLabel.includes("priority") || cleanLabel.includes("targeted") || cleanLabel.includes("support")) {
        if (cleanLabel.includes("enrichment")) {
            return {
                label: "Enrichment Support",
                description: "Provide advanced learning tasks to sustain mastery and deepen understanding."
            };
        }
        return {
            label: "Targeted Remediation",
            description: "Provide focused remediation, guided practice, and one-on-one support based on the learner’s least-mastered competencies."
        };
    }
    if (cleanLabel.includes("reinforcement") || cleanLabel.includes("monitoring")) {
        return {
            label: "Reinforcement Activity",
            description: "Provide additional practice tasks and guided exercises to strengthen understanding and prevent learning gaps."
        };
    }
    return {
        label: "Enrichment Support",
        description: "Provide advanced learning tasks to sustain mastery and deepen understanding."
    };
}

export function getValidationLabel(
    predPercent: number | null | undefined,
    actualPercent: number | null | undefined
): string {
    if (predPercent === null || predPercent === undefined || actualPercent === null || actualPercent === undefined) {
        return "Awaiting Post-Test";
    }
    const predStatus = getLearnerStatus(predPercent);
    const actualStatus = getLearnerStatus(actualPercent);

    if (predStatus === 'Priority Support Learners') {
        if (actualStatus === 'Priority Support Learners') {
            return "Prediction Confirmed: Continued Intervention Required";
        } else {
            return "Improved After Intervention";
        }
    } else {
        if (actualStatus === 'Priority Support Learners') {
            return "Unexpected Performance Decline: Further Review Needed";
        } else {
            return "Expected Performance Maintained";
        }
    }
}

export function getValidationLabelStyle(label: string): string {
    if (label.includes("Confirmed") || label.includes("Decline")) {
        return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (label.includes("Improved")) {
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (label.includes("Maintained")) {
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    return "bg-slate-50 text-slate-400 border-slate-200";
}
