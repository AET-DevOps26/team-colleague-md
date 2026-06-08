{{/*
Expand the name of the chart.
*/}}
{{- define "content.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{/*
Create a default fully qualified app name.
*/}}
{{- define "content.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}
{{/*
Common labels
*/}}
{{- define "content.labels" -}}
helm.sh/chart: {{ include "content.chart" . }}
{{ include "content.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
{{- define "content.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "content.selectorLabels" -}}
app.kubernetes.io/name: {{ include "content.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
{{- define "content.image" -}}
{{- $registry := default "" .Values.global.registry -}}
{{- $repository := .Values.image.repository -}}
{{- $tag := default .Chart.AppVersion .Values.image.tag -}}
{{- $digest := default "" .Values.image.digest -}}
{{- $image := printf "%s/%s" $registry $repository -}}
{{- if not $registry -}}
{{- $image = $repository -}}
{{- end -}}
{{- if $tag -}}
{{- $image = printf "%s:%s" $image $tag -}}
{{- end -}}
{{- if $digest -}}
{{- $image = printf "%s@%s" $image $digest -}}
{{- end -}}
{{- $image -}}
{{- end }}
