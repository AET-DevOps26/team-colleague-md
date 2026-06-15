package com.verita.contentservice.domain;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
@Entity
@Table(name = "topic_categories")
public class TopicCategoryEntity {
    @Id
    @Column(length = 50)
    private String id;
    @Column(nullable = false, length = 100)
    private String label;
    @Column(nullable = false)
    private int sortOrder = 0;
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
