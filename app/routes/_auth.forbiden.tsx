import { Link } from "react-router";

export default function Forbiden() {
    return (
        <main className="grid items-center justify-center h-screen overflow-y-auto">
            <section>
                <h1 className="text-4xl text-center mb-4">دسترسی به این صفحه برای شما امکان پذیر نیست</h1>
                <div className="text-center  text-gray-950 dark:text-white mb-4">
                    <Link className="text-3xl text-gray-950 dark:text-gray-50 hover:text-red-600" to="/">بازگشت به خانه</Link>
                </div>
            </section>
        </main>

    )
}
