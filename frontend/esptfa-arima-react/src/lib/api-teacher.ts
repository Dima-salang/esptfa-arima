import api from "./api";

export interface Subject {
    subject_id: number;
    subject_name: string;
}

export interface Quarter {
    quarter_id: number;
    quarter_name: string;
}

export interface Section {
    section_id: number;
    section_name: string;
}

export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

export interface Student {
    lrn: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    user_id: User;
    section: number | Section;
}

export interface ActualPostTestScore {
    lrn: string;
    score: number;
    max_score: number;
}

export interface AnalysisDocument {
    analysis_document_id: number;
    analysis_doc_title: string;
    quarter: number | Quarter;
    subject: number | Subject;
    upload_date: string;
    test_start_date: string | null;
    status: boolean;
    section_id: number | Section;
}

export interface TestDraft {
    test_draft_id: string;
    title: string;
    quarter: number | Quarter;
    subject: number | Subject;
    test_content: {
        topics?: Topic[];
        students?: any[];
        scores?: Record<string, Record<string, any>>;
        post_test_max_score?: number;
    };
    created_at: string;
    updated_at: string;
    status: string;
    section_id: number | Section;
}

export interface Topic {
    id: string;
    name: string;
    max_score: number;
    test_number?: number;
}

export const getAnalysisDocuments = async (filters?: Record<string, any>) => {
    const response = await api.get("/analysis-document/", { params: filters });
    return response.data.results || response.data;
};

export const getTestDrafts = async (filters?: Record<string, any>) => {
    const response = await api.get("/test-draft/", { params: filters });
    return response.data.results || response.data;
};

export const getSubjects = async () => {
    const response = await api.get("/subject/");
    return response.data.results || response.data;
};

export const getQuarters = async () => {
    const response = await api.get("/quarter/");
    return response.data.results || response.data;
};

export const getSections = async () => {
    const response = await api.get("/section/");
    return response.data.results || response.data;
};

export const deleteAnalysisDocument = async (id: number) => {
    const response = await api.delete(`/analysis-document/${id}/`);
    return response.data;
};

export const createTestDraft = async (data: Partial<TestDraft>, idempotencyKey: string) => {
    const response = await api.post("/test-draft/", data, {
        headers: {
            "Idempotency-Key": idempotencyKey
        }
    });
    return response.data;
};

export const getTestDraft = async (id: string) => {
    const response = await api.get(`/test-draft/${id}/`);
    return response.data;
};

export const updateTestDraft = async (id: string, data: Partial<TestDraft>) => {
    const response = await api.patch(`/test-draft/${id}/`, data);
    return response.data;
};

export const createAnalysisDocument = async (testDraftId: string) => {
    const response = await api.post("/analysis-document/", { test_draft_id: testDraftId });
    return response.data;
};

export const getStudents = async (sectionId?: string) => {
    const params = sectionId ? { section: sectionId } : {};
    const response = await api.get("/student/", { params });
    return response.data.results || response.data;
};

export const getAnalysisFullDetails = async (id: string | number) => {
    const response = await api.get(`/analysis-document/${id}/full_details/`);
    return response.data;
};

export const getPredictedScores = async (analysisDocumentId: string | number) => {
    const response = await api.get("/predicted-score/", {
        params: { analysis_document_id: analysisDocumentId }
    });
    return response.data.results || response.data;
};

export const getStudentAnalysisDetail = async (docId: string | number, lrn: string) => {
    const response = await api.get(`/analysis-document/${docId}/student_analysis_detail/`, {
        params: { lrn }
    });
    return response.data;
};

export const bulkUploadActualScores = async (analysisDocumentId: number, scores: ActualPostTestScore[]) => {
    const response = await api.post("/actual-post-test/bulk_upload/", {
        analysis_document_id: analysisDocumentId,
        scores
    });
    return response.data;
};

export const getTeacherProfile = async () => {
    const response = await api.get("/teacher/me/");
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await api.get("/register/me/");
    return response.data;
};

export const getStudentProfile = async () => {
    const response = await api.get("/student/me/");
    return response.data;
};



export const logoutUser = async () => {
    try {
        const refresh = localStorage.getItem("refresh");
        if (refresh) {
            await api.post("/logout/", { refresh });
        }
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        localStorage.clear();
        globalThis.location.href = "/login";
    }
};
