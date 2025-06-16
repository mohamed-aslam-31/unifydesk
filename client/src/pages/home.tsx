import { useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Star, Truck, Shield, Search } from "lucide-react";
import { useSession } from "@/hooks/use-session";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useSession();

  // Remove redirect to allow public access to home page

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
                Welcome to UnifyDesk Store
                {user && (
                  <span className="block text-2xl lg:text-3xl text-primary mt-2">
                    Hello, {user.firstName}!
                  </span>
                )}
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
                Discover amazing products from verified sellers. Shop with confidence and enjoy seamless delivery.
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto mb-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search for products..."
                    className="w-full pl-10 pr-4 py-4 border border-slate-300 dark:border-slate-600 rounded-lg text-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <Button className="absolute right-2 top-2 px-6">
                    Search
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="px-8 py-3 text-lg">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Start Shopping
                </Button>
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  Browse Categories
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Why Shop with UnifyDesk?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Experience the best of online shopping with our premium features
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Secure Shopping</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Your payments and personal information are protected with enterprise-grade security
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Fast Delivery</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Quick and reliable delivery to your doorstep with real-time tracking
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                  <CardTitle className="text-lg">Quality Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Carefully curated products from verified sellers with quality guarantee
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Easy Returns</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Hassle-free returns and exchanges with our customer-friendly policy
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="bg-white dark:bg-slate-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Shop by Category
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Find exactly what you're looking for
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[
                { name: "Electronics", icon: "📱" },
                { name: "Fashion", icon: "👕" },
                { name: "Home & Garden", icon: "🏠" },
                { name: "Sports", icon: "⚽" },
                { name: "Books", icon: "📚" },
                { name: "Beauty", icon: "💄" },
              ].map((category) => (
                <Card key={category.name} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">{category.icon}</div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {category.name}
                    </h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary to-primary/80 py-16 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Shopping?
            </h2>
            <p className="text-primary-100 text-lg mb-8">
              Join thousands of satisfied customers and discover amazing deals today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg" className="px-8 py-3">
                Browse All Products
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-3 border-white text-white hover:bg-white hover:text-primary">
                View Deals
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
