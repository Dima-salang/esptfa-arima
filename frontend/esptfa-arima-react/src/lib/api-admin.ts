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
