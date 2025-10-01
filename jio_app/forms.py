from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import Usuario


class UsuarioCreateForm(UserCreationForm):
    class Meta:
        model = Usuario
        fields = [
            'username',
            'email',
            'first_name',
            'last_name',
            'tipo_usuario',
            'telefono',
            'is_active',
            'is_staff',
            'is_superuser',
        ]


class UsuarioUpdateForm(forms.ModelForm):
    password = forms.CharField(
        required=False,
        widget=forms.PasswordInput,
        help_text='Deja en blanco para mantener la contraseña actual.'
    )

    class Meta:
        model = Usuario
        fields = [
            'username',
            'email',
            'first_name',
            'last_name',
            'tipo_usuario',
            'telefono',
            'is_active',
            'is_staff',
            'is_superuser',
        ]

    def save(self, commit=True):
        usuario = super().save(commit=False)
        nueva_password = self.cleaned_data.get('password')
        if nueva_password:
            usuario.set_password(nueva_password)
        if commit:
            usuario.save()
        return usuario



