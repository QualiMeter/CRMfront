CRM frontend v17 — student and teacher portals

Что добавлено:
- роли Student и Teacher из актуального OpenAPI;
- отдельный кабинет студента с программой, этапами, материалами и профилем;
- отдельный кабинет преподавателя с программами и списком студентов;
- нейтральный экран ожидания для самостоятельной регистрации с ролью User;
- управление студентами и преподавателями для менеджера в пределах доступных вузов;
- персональные приглашения с одноразовым токеном, сроком действия и отзывом;
- отдельная форма принятия приглашения с созданием логина и пароля;
- редактирование профилей через /students/me и /teachers/me;
- адаптивное ролевое меню.

Самостоятельная регистрация сохранена. После неё менеджер назначает пользователю роль Student или Teacher.

Методы API: getUsers, createUser, updateUser, inviteUser, revokeUserInvite,
getMyStudentProfile, updateMyStudentProfile, getStudents,
getMyTeacherProfile, updateMyTeacherProfile, getTeachers.

Проверено: npm run build, git diff --check.
