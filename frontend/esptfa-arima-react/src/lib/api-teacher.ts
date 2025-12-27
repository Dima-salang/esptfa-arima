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
    test_content: any;
    created_at: string;
    updated_at: string;
    status: string;
    section_id: number | Section;
}

export const getAnalysisDocuments = async () => {
    const response = await api.get("/analysis-document/");
    return response.data;
};

export const getTestDrafts = async () => {
    const response = await api.get("/test-draft/");
    return response.data;
};

export const getSubjects = async () => {
    const response = await api.get("/subject/");
    return response.data;
};

export const getQuarters = async () => {
    const response = await api.get("/quarter/");
    return response.data;
};

export const getSections = async () => {
    const response = await api.get("/section/");
    return response.data;
};

export const deleteAnalysisDocument = async (id: number) => {
    const response = await api.delete(`/analysis-document/${id}/`);
    return response.data;
};

export const createTestDraft = async (data: any, idempotencyKey: string) => {
    const response = await api.post("/test-draft/", data, {
        headers: {
            "Idempotency-Key": idempotencyKey
        }
    });
    return response.data;
};
