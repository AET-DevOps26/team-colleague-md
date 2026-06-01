{{/*
Expand the name of the chart.
*/}}
{{- define "recommendation.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{/*
Create a default fully qualified app name.
*/}}
{{- define "recommendation.fullname" -}}
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
{{- define "recommendation.labels" -}}
helm.sh/chart: {{ include "recommendation.chart" . }}
{{ include "recommendation.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
{{- define "recommendation.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "recommendation.selectorLabels" -}}
app.kubernetes.io/name: {{ include "recommendation.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
{{- define "recommendation.image" -}}
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
