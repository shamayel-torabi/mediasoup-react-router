import { Form } from "react-router";
import type { User } from "~/types";
import { Spinner } from "~/components/Spinner";
import { deleteUser, getUsers } from "~/.server/user";
import type { Route } from "./+types/_main.users";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "فهرست کاربران" },
    { name: "description", content: "Video Conferencing App" },
  ];
}

type LoaderProps = {
  users?: User[],
  error?: string
}

export async function loader(): Promise<LoaderProps> {
  try {
    const users = await getUsers();
    return {users};    

  } catch (error: unknown) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "خطای غیر منتظره "
    return { error: errorMessage }
  }
}

export function HydrateFallback() {
  return <Spinner />
}

export async function action({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const id = formData.get("id") as string;

  try {
    const user = await deleteUser(id);
  } catch (error) {
    console.error(error);
    return { error: error }
  }
}

export default function Users({ loaderData }: Route.ComponentProps) {
  const { users, error } = loaderData;

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg m-2">
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr >
            <th className="px-6 py-3">شناسه</th>
            <th className="px-6 py-3">رایانامه</th>
            <th className="px-6 py-3">نام</th>
            <th className="px-6 py-3">تاریخ ایجاد</th>
            <th className="px-6 py-3">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {users?.map(user =>
            <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700 border-gray-200" key={user.id}>
              <td className="px-6 py-4">{user.id}</td>
              <td className="px-6 py-4">{user.email}</td>
              <td className="px-6 py-4">{`${user.firstName} ${user.lastName}`}</td>
              <td className="px-6 py-4">{new Date(user.createdAt).toLocaleString('fa-IR')}</td>
              <td className="px-6 py-4">
                <Form method="post">
                  <input name="id" hidden defaultValue={user.id} />
                  <button className='cursor-pointer hover:text-red-500' type="submit">
                    حذف
                  </button>
                </Form>
              </td>
            </tr>)}
        </tbody>
      </table>
      {error && (<p className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">خطا : {error}</p>)}
    </div>
  )
}
