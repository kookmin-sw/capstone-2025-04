// BOJ - 10432 데이터 스트림의 섬 ( EC#3 - Problem 11 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
void exec() {
    int t, ans = 0; cin >> t;
    int arr[12] = {0, }; loop(i, 0, 11) cin >> arr[i];

    set<int> s; loop(i, 0, 11) if(arr[i]) s.insert(arr[i]);
    for(int v : s) {
        int started = 0;
        for(int i : arr) {
            if(!started && i == v) ans++, started = 1;
            if(i < v) started = 0;
            // 0 1 1 1 0 1 1 1 0 을 생각하면 된다. 단적으로, 1만 보았을 때 1보다 작은게 나오면 새로운 섬이 시작되기 때문이다.
        }
    }
    cout << t << ' ' << ans << '\n';
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int p; cin >> p;
    while(p--) exec();
}