import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import './MyProjects.css';

const MyProjectDetail = () => {

    const { projectId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const fetchProject = async () => {

            try {

                const response =
                    await api.get(
                        `/employee/projects/${projectId}`
                    );

                setData(response.data);

            } catch (error) {

                console.error(error);

            } finally {

                setLoading(false);

            }
        };

        fetchProject();

    }, [projectId]);


    if (loading) {
        return (
            <div className="projects-empty">
                Đang tải dự án...
            </div>
        );
    }


    if (!data) {
        return (
            <div className="projects-empty">
                Không thể tải dự án.
            </div>
        );
    }


    const project = data.project;


    return (
        <div className="projects-page">

            <button
                className="back-button"
                onClick={() =>
                    navigate('/employee/projects')
                }
            >
                ← Quay lại
            </button>


            <div className="project-detail-card">

                <div className="project-detail-header">

                    <div>

                        <span className="project-detail-icon">
                            📁
                        </span>

                        <h1>
                            {project.name}
                        </h1>

                        <p>
                            {project.description ||
                                'Không có mô tả'}
                        </p>

                    </div>

                    <span className="project-status">
                        {project.status}
                    </span>

                </div>


                <div className="project-detail-meta">

                    <div>
                        <span>Vai trò</span>
                        <strong>
                            {data.role_in_project ||
                                'Thành viên'}
                        </strong>
                    </div>

                    <div>
                        <span>Ngày bắt đầu</span>
                        <strong>
                            {project.start_date || '--'}
                        </strong>
                    </div>

                    <div>
                        <span>Ngày kết thúc</span>
                        <strong>
                            {project.end_date || '--'}
                        </strong>
                    </div>

                </div>


                <section className="project-phases">

                    <h2>Các giai đoạn</h2>

                    {data.phases?.length ? (

                        data.phases.map(phase => (

                            <div
                                className="phase-item"
                                key={phase.id}
                            >

                                <div>

                                    <strong>
                                        {phase.name}
                                    </strong>

                                    <p>
                                        {phase.description ||
                                            'Không có mô tả'}
                                    </p>

                                </div>

                                <span>
                                    {phase.status}
                                </span>

                            </div>

                        ))

                    ) : (

                        <p className="no-data">
                            Chưa có giai đoạn.
                        </p>

                    )}

                </section>


                <section className="project-phases">

                    <h2>Công việc của tôi trong dự án</h2>

                    {data.myTasks?.length ? (

                        data.myTasks.map(task => (

                            <div
                                className="phase-item"
                                key={task.id}
                                onClick={() =>
                                    navigate(
                                        `/employee/tasks/${task.id}`
                                    )
                                }
                            >

                                <div>

                                    <strong>
                                        {task.title}
                                    </strong>

                                    <p>
                                        Deadline:{' '}
                                        {task.deadline
                                            ? new Date(
                                                task.deadline
                                            ).toLocaleDateString(
                                                'vi-VN'
                                            )
                                            : '--'}
                                    </p>

                                </div>

                                <span>
                                    {task.status}
                                </span>

                            </div>

                        ))

                    ) : (

                        <p className="no-data">
                            Bạn chưa được giao task nào trong dự án.
                        </p>

                    )}

                </section>

            </div>

        </div>
    );
};

export default MyProjectDetail;