import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="btn" style={{ marginTop: '20px', textDecoration: 'none' }}>
        Go back Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
