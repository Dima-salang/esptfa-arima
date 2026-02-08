import api from "./api";

export interface TeacherAssignment {
    id: number;
    teacher: number;
    section: number;
    subject: number;
    created_at: string;
    updated_at: string;
    teacher_details?: {
        id: number;
        username: string;
        first_name: string;
        last_name: string;
        name: string;
    };
    subject_details?: {
        subject_id: number;
        subject_name: string;
    };
    section_details?: {
        section_id: number;
        section_name: string;
    };
}

export interface Teacher {
    id: number;
    user_id: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
    };
}

export interface Subject {
    subject_id: number;
    subject_name: string;
}

export interface Section {
    section_id: number;
    section_name: string;
}

export interface Student {
    lrn: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    section: number;
}

export const getTeacherAssignments = async () => {
    const response = await api.get("/teacher-assignment/");
    return response.data;
};

export const createTeacherAssignment = async (data: {
    teacher: number;
    section: number;
    subject: number;
}) => {
    const response = await api.post("/teacher-assignment/", data);
    return response.data;
};

export const deleteTeacherAssignment = async (id: number) => {
    const response = await api.delete(`/teacher-assignment/${id}/`);
    return response.data;
};

export const getAllTeachers = async () => {
    const response = await api.get("/teacher/");
    return response.data;
};

export const getAllSubjects = async () => {
    const response = await api.get("/subject/");
    return response.data;
};

export const getAllSections = async () => {
    const response = await api.get("/section/");
    return response.data;
};

export const getSystemStats = async () => {
    const response = await api.get("/system-stats/");
    return response.data;
};

export const bulkImportCSV = async (file: File) => {
    const formData = new FormData();
    formData.append("student_import_file", file);
    const response = await api.post("/student/bulk_import_csv/", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const manualImportStudents = async (students: Student[]) => {
    const response = await api.post("/student/manual_import/", { students });
    return response.data;
};

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    is_active: boolean;
    is_superuser: boolean;
    acc_type: string;
    date_joined: string;
    last_login: string;
    teacher_id?: number;
    student_lrn?: string;
}

export const getAllUsers = async (params?: any) => {
    const response = await api.get("/users/", { params });
    return response.data;
};

export const getUserById = async (id: number) => {
    const response = await api.get(`/users/${id}/`);
    return response.data;
};

export const updateUser = async (id: number, data: Partial<User> & { password?: string }) => {
    const response = await api.patch(`/users/${id}/`, data);
    return response.data;
};

export const deleteUser = async (id: number) => {
    const response = await api.delete(`/users/${id}/`);
    return response.data;
};

// --- Subjects CRUD ---

export const createSubject = async (data: { subject_name: string }) => {
    const response = await api.post("/subject/", data);
    return response.data;
};

export const updateSubject = async (id: number, data: { subject_name: string }) => {
    const response = await api.patch(`/subject/${id}/`, data);
    return response.data;
};

export const deleteSubject = async (id: number) => {
    const response = await api.delete(`/subject/${id}/`);
    return response.data;
};

// --- Sections CRUD ---

export const createSection = async (data: { section_name: string }) => {
    const response = await api.post("/section/", data);
    return response.data;
};

export const updateSection = async (id: number, data: { section_name: string }) => {
    const response = await api.patch(`/section/${id}/`, data);
    return response.data;
};

export const deleteSection = async (id: number) => {
    const response = await api.delete(`/section/${id}/`);
    return response.data;
};

// --- Quarters CRUD ---

export interface Quarter {
    quarter_id: number;
    quarter_name: string;
}

export const getAllQuarters = async () => {
    const response = await api.get("/quarter/");
    return response.data;
};

export const createQuarter = async (data: { quarter_name: string }) => {
    const response = await api.post("/quarter/", data);
    return response.data;
};

export const updateQuarter = async (id: number, data: { quarter_name: string }) => {
    const response = await api.patch(`/quarter/${id}/`, data);
    return response.data;
};

export const deleteQuarter = async (id: number) => {
    const response = await api.delete(`/quarter/${id}/`);
    return response.data;
};

// --- Topics CRUD ---

export interface Topic {
    topic_id: number;
    topic_name: string;
    subject?: number;
    max_score?: number;
    test_number?: string;
}

export const getAllTopics = async () => {
    const response = await api.get("/test-topic/");
    return response.data;
};

export const createTopic = async (data: Partial<Topic>) => {
    const response = await api.post("/test-topic/", data);
    return response.data;
};

export const updateTopic = async (id: number, data: Partial<Topic>) => {
    const response = await api.patch(`/test-topic/${id}/`, data);
    return response.data;
};

export const deleteTopic = async (id: number) => {
    const response = await api.delete(`/test-topic/${id}/`);
    return response.data;
};
