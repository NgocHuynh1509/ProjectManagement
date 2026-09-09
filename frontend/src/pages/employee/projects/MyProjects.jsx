import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import './MyProjects.css';

const MyProjects = () => {

    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const fetchProjects = async () => {

            try {

                const response =
                    await api.get('/employee/projects');

                setProjects(response.data || []);

            } catch (error) {

                console.error(error);

            } finally {

                setLoading(false);

            }
        };

        fetchProjects();

    }, []);


    return (
        <div className="projects-page">

            <div className="employee-page-heading">

                <h1>Dự án của tôi</h1>

                <p>
                    Các dự án bạn đang tham gia
                </p>

            </div>


            {loading ? (

                <div className="projects-empty">
                    Đang tải dự án...
                </div>

            ) : projects.length ? (

                <div className="employee-project-grid">

                    {projects.map(project => (

                        <div
                            className="employee-project-card"
                            key={project.id}
                            onClick={() =>
                                navigate(
                                    `/employee/projects/${project.id}`
                                )
                            }
                        >

                            <div className="project-icon">
                                📁
                            </div>

                            <h2>
                                {project.name}
                            </h2>

                            <p>
                                {project.description ||
                                    'Không có mô tả'}
                            </p>

                            <div className="project-info">

                                <span>
                                    👤{' '}
                                    {project.role_in_project ||
                                        'Thành viên'}
                                </span>

                                <span>
                                    📌 {project.status}
                                </span>

                            </div>

                            <div className="project-dates">

                                <span>
                                    {project.start_date || '--'}
                                </span>

                                <span>
                                    →
                                </span>

                                <span>
                                    {project.end_date || '--'}
                                </span>

                            </div>

                        </div>

                    ))}

                </div>

            ) : (

                <div className="projects-empty">
                    Bạn chưa tham gia dự án nào.
                </div>

            )}

        </div>
    );
};

export default MyProjects;