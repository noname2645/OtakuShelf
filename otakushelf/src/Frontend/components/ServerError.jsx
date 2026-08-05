import React, { useEffect } from 'react';
import { Header } from './header.jsx';
import BottomNavBar from "./bottom.jsx";
import Footer from './footer.jsx';
import ErrorPage from './ErrorPage.jsx';
import { usePageLoader } from './PageLoaderContext.jsx';

const ServerError = () => {
  const { finishLoading } = usePageLoader();
  useEffect(() => { finishLoading(); }, [finishLoading]);
  return (
    <>
      <Header />
      <ErrorPage type="500" />
      <Footer />
      <BottomNavBar />
    </>
  );
};

export default ServerError;
