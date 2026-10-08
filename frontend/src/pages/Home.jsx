import Header from "../components/layout/Header";
import Categories from "../components/home/Categories";
import Hero from "../components/home/Hero";
import { HomeBenefits, HomeFooter } from "../components/home/HomeSections";

function Home() {
  return (
    <div className="min-h-screen w-full bg-linen">
      <Header />
      <main className="w-full">
        <Hero />
        <HomeBenefits />
        <Categories />
      </main>
      <HomeFooter />
    </div>
  );
}

export default Home;
