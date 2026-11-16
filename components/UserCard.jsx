export default function UserCard({ user }) {
  return (
    <article className="rounded border p-4">
      <h2 className="font-semibold">{user.name}</h2>
      <p>{user.email}</p>
    </article>
  );
}
