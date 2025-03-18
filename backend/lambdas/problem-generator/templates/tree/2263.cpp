// BOJ - 2263 트리의 순회

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
void f(vector<int> in, vector<int> post) {
    if(in.size() == 0) return;

    int root = post[post.size() - 1], irp = 0; // inorder root position
    while(in[irp] != root) irp++; // inorder에서의 root position 찾기

    cout << root << ' '; // root -> Left -> Right; Preorder
    if(in.size() == 1) return;

    int left_size = irp, right_size = in.size() - irp - 1;
    vector<int> left_in, left_post, right_in, right_post;
    LOOP(i, 0, left_size) { left_in.push_back(in[i]); left_post.push_back(post[i]); }
    LOOP(i, 0, right_size) { right_in.push_back(in[i + irp + 1]); right_post.push_back(post[i + irp]); }

    f(left_in, left_post);
    f(right_in, right_post);
}

// f(in, post) -> memory limit exceeded, solution -> 전역변수화해서 메모리 사용을 줄이기
vector<int> in, post;

void g(int ins, int pos, int size) { // in, post 의 크기는 똑같으므로 size로 동일시
    //cout << "g called with parameters: " << ins << ' ' << pos << ' ' << size << "\n";
    if(size <= 0) return;

    int root = post[pos + size - 1], irp = ins; // inorder root position
    while(in[irp] != root) irp++; // inorder에서의 root position 찾기

    cout << root << ' ';
    if(size == 1) return;

    int left_size = irp - ins, right_size = size - left_size - 1;
    g(ins, pos, left_size); // left
    g(irp + 1, pos + left_size, right_size); // right
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    
    loop(i, 1, n) { int k; cin >> k; in.push_back(k); }
    loop(i, 1, n) { int k; cin >> k; post.push_back(k); }
    //f(in, post);
    g(0, 0, n);
    cout << '\n';
}