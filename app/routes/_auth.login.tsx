import { Form, Link, redirect } from "react-router";
import { z, type ZodFormattedError } from "zod";
import { Card } from "~/components/Card";
import { Errors } from "~/components/Errors";
import type { Route } from "./+types/_auth.login";
import { createUserSession, getUserId } from "~/.server/session";


export function meta({ }: Route.MetaArgs) {
  return [
    { title: "ورود کاربر" },
    { name: "description", content: "Video Conferencing App" },
  ];
}

const loginUserSchema = z.object({
  email: z.string({ message: "ریانامه باید وارد شود" })
    .email({ message: "نشانی رایانامه معتبر نمی باشد" }),
  password: z.string({ message: "گذرواژه  باید وارد شود" })
    .min(4, { message: "گذرواژه اشتباه است" }),
})

type ActionProps = {
  errors?: ZodFormattedError<{
    email: string;
    password: string;
    customError: string;
  }, string> | undefined
}

export async function loader({ request }: Route.LoaderArgs) {
  // Check if the user is already logged in
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/");
  }
}

export async function action({ request }: Route.ActionArgs) : Promise<ActionProps> {
  let response: Response;
  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    const result = loginUserSchema.safeParse({ email, password });

    if (!result.success) {
      return {
        errors: result.error.format()
      };
    }

    // Check the user's credentials
    if (email !== "shamayel.torabi@gmail.com" || password !== "sham") {
      throw new Error("رایانامه یا گذرواژه اشتباه است!");
    }

    // Create a session
    response = await createUserSession({
      request,
      userId: email,
      remember: true,
    });

    if (!response) {
      throw new Error("یک خطا هنگام ایجاد جلسه رخ داده است!");
    }
  } catch (error) {
    if (error instanceof Error) {

      return {
        errors: {
          _errors: [],
          customError: {
            _errors: [error.message]
          }
        }
      };
    }

    return {
      errors: {
        _errors: [],
        customError: {
          _errors: ['یک خطای ناشناخته رخ داده است!']
        }
      }
    };
  }

  throw response;
}

export default function Login({ actionData }: Route.ComponentProps) {

  return (
    <section className="grid items-center justify-center h-screen">
      <Card className="grid grid-cols-1 md:grid-cols-2 gap-4 w-sm md:w-[47rem]">
        <Card className="min-h-96">
          <Form method="post" className="flex flex-col justify-between h-full">
            <div>
              <h1 className="text-3xl text-gray-900 dark:text-white">ورود به وبگاه</h1>
            </div>
            <div>
              <div className="mb-5">
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">رایانامه</label>
                <input
                  type="email" id="email"
                  name="email"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="name@flowbite.com" />
                <Errors errors={actionData?.errors?.email?._errors} />
              </div>
              <div className="mb-5">
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">گذرواژه</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                />
                <Errors errors={actionData?.errors?.password?._errors} />
              </div>
            </div>
            <div>
              <Errors errors={actionData?.errors?.customError?._errors} />
            </div>
            <div className='flex justify-end'>
              <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">ارسال</button>
            </div>
          </Form>
        </Card>
        <Card className="flex flex-col justify-between min-h-96">
          <div className="flex flex-col justify-between">
            <svg className="h-48 text-gray-900 dark:text-white" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 110.74 122.88">
              <g>
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M48.47,116.35c1.8,0,3.27,1.46,3.27,3.26c0,1.8-1.46,3.26-3.27,3.26H7.6c-2.09,0-3.99-0.85-5.37-2.23 C0.85,119.27,0,117.38,0,115.28V7.6C0,5.5,0.85,3.61,2.23,2.23C3.61,0.85,5.5,0,7.6,0h93.3c2.09,0,3.99,0.86,5.37,2.23 c1.38,1.38,2.23,3.27,2.23,5.37v53.95c0,1.8-1.46,3.26-3.26,3.26c-1.8,0-3.26-1.46-3.26-3.26V7.6c0-0.29-0.12-0.56-0.32-0.75 c-0.2-0.2-0.47-0.32-0.75-0.32H7.6c-0.29,0-0.56,0.12-0.76,0.31C6.65,7.05,6.53,7.31,6.53,7.6v107.68c0,0.29,0.12,0.56,0.32,0.75 c0.2,0.2,0.47,0.32,0.76,0.32L48.47,116.35L48.47,116.35L48.47,116.35z M33.94,57.92c-0.62-1.07-0.17-4.13,1.16-5.21 c3.8-2.22,9.04-1.53,12.7-4.09c0.21-0.32,0.44-0.78,0.67-1.29c0.33-0.76,0.64-1.59,0.83-2.16c-0.81-0.96-1.51-2.04-2.17-3.1 l-2.2-3.5c-0.8-1.2-1.22-2.3-1.25-3.2c-0.01-0.42,0.06-0.81,0.22-1.15c0.16-0.36,0.41-0.65,0.76-0.88c0.16-0.11,0.34-0.2,0.53-0.27 c-0.15-1.9-0.2-4.29-0.1-6.3c0.05-0.47,0.14-0.95,0.27-1.43c0.56-2.01,1.97-3.63,3.72-4.74c0.96-0.61,2.02-1.08,3.12-1.39 c0.7-0.2-0.6-2.43,0.13-2.51c3.5-0.36,9.15,2.83,11.59,5.47c1.22,1.32,1.99,3.08,2.16,5.4l-0.14,5.71l0,0 c0.61,0.19,1,0.57,1.16,1.2c0.18,0.7-0.01,1.67-0.61,3.01l0,0c-0.01,0.02-0.02,0.05-0.04,0.07l-2.51,4.13 c-0.92,1.52-1.86,3.04-3.08,4.24c0.11,0.16,0.23,0.32,0.34,0.48c0.5,0.73,1,1.46,1.64,2.11c0.02,0.02,0.04,0.05,0.05,0.07 c2.89,2.04,9.92,2.54,12.62,4.04l0.11,0.06c1.39,1.07,1.82,4.13,1.18,5.2H33.94L33.94,57.92z M102.29,79.04 c-0.53-0.51-1.14-0.75-1.84-0.74c-0.71,0.01-1.31,0.29-1.8,0.81l-4.05,4.22l11.37,10.98l4.09-4.26c0.49-0.5,0.69-1.14,0.68-1.84 c-0.01-0.69-0.26-1.33-0.76-1.8L102.29,79.04L102.29,79.04L102.29,79.04z M84.54,116.17c-1.5,0.48-3,0.97-4.49,1.46 c-1.5,0.5-3,1-4.49,1.5c-3.53,1.16-5.51,1.8-5.93,1.92c-0.4,0.12-0.17-1.53,0.73-4.99l2.81-10.83l0,0l17.82-18.18l11.36,10.93 L84.54,116.17L84.54,116.17L84.54,116.17z M31.74,95.36c-1.8,0-3.27-1.48-3.27-3.31s1.46-3.31,3.27-3.31h22.21 c1.8,0,3.27,1.48,3.27,3.31s-1.46,3.31-3.27,3.31H31.74L31.74,95.36L31.74,95.36z M31.74,74.67c-1.8,0-3.26-1.46-3.26-3.27 c0-1.8,1.46-3.26,3.26-3.26h44.05c1.8,0,3.26,1.46,3.26,3.26c0,1.8-1.46,3.27-3.26,3.27H31.74L31.74,74.67L31.74,74.67z" />
              </g>
            </svg>
            <p className="my-8 text-gray-900 dark:text-white">
              اگر تاکنون به این وبگاه وارد نشده اید با کلیک دکمه ثبت نام در این وبگاه ثبت نام و وارد شوید
            </p>
          </div>
          <div className='flex justify-end'>
            <Link to="/register">
              <button className="border-0 cursor-pointer text-gray-900 dark:text-white">
                ثبت نام
              </button>
            </Link>
          </div>
        </Card>
      </Card>
    </section>
  )
}
