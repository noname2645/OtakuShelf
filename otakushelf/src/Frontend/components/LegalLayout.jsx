import React, { useEffect } from 'react';
import { Header } from './header.jsx';
import BottomNavBar from './bottom.jsx';
import Footer from './footer.jsx';
import { usePageLoader } from './PageLoaderContext.jsx';
import usePageMeta from '../hooks/usePageMeta.js';
import '../Stylesheets/legal.css';

/**
 * Shared layout for informational pages (Privacy, Terms, About, Contact).
 */
const LegalLayout = ({ title, description, children }) => {
  const { finishLoading } = usePageLoader();
  usePageMeta(title, description);

  useEffect(() => {
    finishLoading();
  }, [finishLoading]);

  return (
    <>
      <Header showSearch={false} />
      <main className="legal-page">
        <article className="legal-content">
          <header className="legal-header">
            <h1>{title}</h1>
          </header>
          <div className="legal-body">{children}</div>
        </article>
      </main>
      <Footer />
      <BottomNavBar />
    </>
  );
};

export default LegalLayout;
